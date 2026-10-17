/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */


/* 交互特效：hover 光标跟随光斑 + 选项按钮点击灰色波纹（事件委托实现） */

const SPOTLIGHT = '.row, .option-btn, .back'; // 光斑作用的元素选择器
const RIPPLE = '.option-btn'; // 波纹作用的元素选择器（仅选项按钮）

/* 启用交互特效，事件委托挂在 root 上 */
export function initEffects(root: HTMLElement): void {
  root.addEventListener('mousemove', (e) => {
    const host = (e.target as HTMLElement).closest<HTMLElement>(SPOTLIGHT);
    if (!host) return;
    const rect = host.getBoundingClientRect();
    host.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    host.style.setProperty('--my', `${e.clientY - rect.top}px`);
  });

  root.addEventListener('click', (e) => {
    const host = (e.target as HTMLElement).closest<HTMLElement>(RIPPLE);
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const size = Math.hypot(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    host.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
    window.setTimeout(() => ripple.remove(), 400);
  });
}
