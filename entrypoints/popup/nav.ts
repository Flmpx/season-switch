/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */


/* 导航栈：管理弹窗页面的层级切换与高度自适应 */

const MAX_HEIGHT = 600; // 与 .page 的 max-height 一致，避免超出 Chrome 弹窗高度上限

let stack: HTMLElement[] = [];
let pagesEl: HTMLElement | null = null;

/* 初始化导航容器 */
export function initNav(container: HTMLElement): void {
  pagesEl = container;
}

/* 测量栈顶页面的自然高度，限制在 MAX_HEIGHT 内 */
function measureTopHeight(): number {
  if (!pagesEl || stack.length === 0) return 0;
  const top = stack[stack.length - 1];
  return Math.min(top.scrollHeight, MAX_HEIGHT);
}

/* 按栈下标相对当前栈顶，设置每个页面的横向位移 */
function setPageTransforms(): void {
  if (!pagesEl) return;
  const current = stack.length - 1;
  stack.forEach((page, i) => {
    const offset = i - current;
    page.style.transform = `translateX(${offset * 100}%)`;
  });
}

/* 写入容器高度；animate 为 false 时关闭过渡，避免首屏高度突变 */
function applyHeight(animate: boolean): void {
  if (!pagesEl) return;
  const h = measureTopHeight();
  if (animate) {
    pagesEl.style.height = `${h}px`;
  } else {
    const prev = pagesEl.style.transition;
    pagesEl.style.transition = 'none';
    pagesEl.style.height = `${h}px`;
    void pagesEl.offsetHeight;
    pagesEl.style.transition = prev;
  }
}

/* 推入新页面：新页右滑入、旧页左滑出 */
export function pushPage(page: HTMLElement, animate = true): void {
  if (!pagesEl) return;
  pagesEl.appendChild(page);
  stack.push(page);

  if (animate) {
    page.style.transition = 'none';
    page.style.transform = 'translateX(100%)';
    void page.offsetHeight;
    page.style.transition = '';
    setPageTransforms();
    applyHeight(true);
  } else {
    pagesEl.classList.add('no-anim');
    setPageTransforms();
    applyHeight(false);
    void pagesEl.offsetHeight;
    pagesEl.classList.remove('no-anim');
  }
}

/* 弹出栈顶页面：当前页右滑出、下层页归位 */
export function popPage(): void {
  if (!pagesEl || stack.length <= 1) return;
  const top = stack.pop()!;
  top.style.transform = 'translateX(100%)';
  setPageTransforms();
  applyHeight(true);
  const remove = () => top.remove();
  const onEnd = (e: TransitionEvent) => {
    if (e.target !== top || e.propertyName !== 'transform') return;
    top.removeEventListener('transitionend', onEnd);
    remove();
  };
  top.addEventListener('transitionend', onEnd);
  window.setTimeout(remove, 400);
}

/* 当前页内容高度变化时调用（如展开自定义滑块），重新做高度过渡 */
export function refreshHeight(): void {
  applyHeight(true);
}
