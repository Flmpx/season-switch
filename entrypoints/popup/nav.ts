/*
 * 导航栈：维护一个页面元素栈，采用 iOS 式层级切换。
 * 每个页面绝对定位、按"其在栈中的下标相对当前栈顶的偏移"各自做 translateX：
 *   栈顶 translateX(0) 可见；其下各层依次左移 -100%（已滑出）；更深层依次右移 +100%（待滑入）。
 * 该模式与层级深度无关，任意多级下钻/回退都正确。
 *
 * 过渡动画：
 *   - pushPage：新页先瞬时置于右侧屏外 translateX(100%)，强制回流提交起始位后，
 *     再统一设置所有页面目标位移 → 旧页 translateX(0→-100%) 左滑出、新页 translateX(100%→0) 右滑入。
 *   - popPage：弹出页 translateX(0→+100%) 右滑出，下层页归位 translateX(-100%→0) 滑入。
 *   弹层高度由当前（栈顶）页面内容决定，切换时通过 CSS height 过渡平滑变化。
 */

const MAX_HEIGHT = 600; // 与 .page 的 max-height 一致，避免超出 Chrome 弹窗上限

let stack: HTMLElement[] = [];
let pagesEl: HTMLElement | null = null;

export function initNav(container: HTMLElement): void {
  pagesEl = container;
}

/* 测量栈顶页面的自然高度（整页内容高度），并限制在 MAX_HEIGHT 内 */
function measureTopHeight(): number {
  if (!pagesEl || stack.length === 0) return 0;
  const top = stack[stack.length - 1];
  return Math.min(top.scrollHeight, MAX_HEIGHT);
}

/* 按栈下标相对当前栈顶设置每个页面的横向位移 */
function setPageTransforms(): void {
  if (!pagesEl) return;
  const current = stack.length - 1;
  stack.forEach((page, i) => {
    const offset = i - current;
    page.style.transform = `translateX(${offset * 100}%)`;
  });
}

function applyHeight(animate: boolean): void {
  if (!pagesEl) return;
  const h = measureTopHeight();
  if (animate) {
    pagesEl.style.height = `${h}px`;
  } else {
    // 无动画：临时关闭过渡、写入高度、强制回流后再恢复，避免首屏/重置时高度突变
    const prev = pagesEl.style.transition;
    pagesEl.style.transition = 'none';
    pagesEl.style.height = `${h}px`;
    void pagesEl.offsetHeight;
    pagesEl.style.transition = prev;
  }
}

export function pushPage(page: HTMLElement, animate = true): void {
  if (!pagesEl) return;
  pagesEl.appendChild(page);
  stack.push(page);

  if (animate) {
    // 新页先置于右侧屏外（瞬时，关闭过渡），强制回流提交起始位，
    // 再恢复过渡并统一设目标位移 → 触发“旧页左滑出 + 新页右滑入”双向过渡
    page.style.transition = 'none';
    page.style.transform = 'translateX(100%)';
    void page.offsetHeight;
    page.style.transition = '';
    setPageTransforms();
    applyHeight(true);
  } else {
    // 首屏 / 重置：关闭所有过渡，直接落位，避免开场动画与高度突变
    pagesEl.classList.add('no-anim');
    setPageTransforms();
    applyHeight(false);
    void pagesEl.offsetHeight;
    pagesEl.classList.remove('no-anim');
  }
}

export function popPage(): void {
  if (!pagesEl || stack.length <= 1) return;
  const top = stack.pop()!;
  top.style.transform = 'translateX(100%)'; // 当前页向右滑出
  setPageTransforms(); // 下层页面从左侧归位到 0
  applyHeight(true);
  const remove = () => top.remove();
  // transform 过渡发生在被弹出的页面自身上
  const onEnd = (e: TransitionEvent) => {
    if (e.target !== top || e.propertyName !== 'transform') return;
    top.removeEventListener('transitionend', onEnd);
    remove();
  };
  top.addEventListener('transitionend', onEnd);
  window.setTimeout(remove, 400); // 兜底：避免 transitionend 未触发时节点残留
}

/* 当前页内容高度变化时（如展开“自定义”滑块）调用，重新做高度过渡 */
export function refreshHeight(): void {
  applyHeight(true);
}
