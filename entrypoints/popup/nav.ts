/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

const MAX_HEIGHT = 600; // 与 .page 的 max-height 一致，即弹窗高度上限

/** 导航栈里的一页：元素加可选的刷新函数 */
interface StackEntry {
  el: HTMLElement; // 页面元素
}

const refreshers = new WeakMap<HTMLElement, () => void>(); // 页面到刷新函数的映射
let stack: StackEntry[] = []; // 导航栈：管理页面层级切换与高度自适应
let pagesEl: HTMLElement | null = null; // 导航容器

/** 初始化导航容器 */
export function initNav(container: HTMLElement): void {
  pagesEl = container;
}

/** 为一页登记刷新函数，返回该页时数据有变就调用它重建内容 */
export function setPageRefresh(page: HTMLElement, refresh: () => void): void {
  refreshers.set(page, refresh);
}

/** 测量栈顶页面的自然高度，限制在 MAX_HEIGHT 内 */
function measureTopHeight(): number {
  if (!pagesEl || stack.length === 0) return 0;
  const top = stack[stack.length - 1];
  return Math.min(top.el.scrollHeight, MAX_HEIGHT);
}

/** 按栈下标相对当前栈顶，设置每个页面的横向位移 */
function setPageTransforms(): void {
  if (!pagesEl) return;
  const current = stack.length - 1;
  stack.forEach((entry, i) => {
    const offset = i - current;
    entry.el.style.transform = `translateX(${offset * 100}%)`;
  });
}

/** 写入容器高度，animate 为 false 时不做过渡 */
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

/** 推入新页面：新页右滑入、旧页左滑出 */
export function pushPage(page: HTMLElement, animate = true): void {
  if (!pagesEl) return;
  pagesEl.appendChild(page);
  stack.push({ el: page });

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

/** 弹出栈顶页面：当前页右滑出、下层页归位并按需刷新内容 */
export function popPage(): void {
  if (!pagesEl || stack.length <= 1) return;
  const top = stack.pop()!;
  top.el.style.transform = 'translateX(100%)';
  setPageTransforms();

  const previous = stack[stack.length - 1];
  if (previous) refreshers.get(previous.el)?.();

  applyHeight(true);
  const remove = () => top.el.remove();
  const onEnd = (e: TransitionEvent) => {
    if (e.target !== top.el || e.propertyName !== 'transform') return;
    top.el.removeEventListener('transitionend', onEnd);
    remove();
  };
  top.el.addEventListener('transitionend', onEnd);
  window.setTimeout(remove, 400);
}

/** 当前页内容高度变化时再次做高度过渡 */
export function refreshHeight(): void {
  applyHeight(true);
}
