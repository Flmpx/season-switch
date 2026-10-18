/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/* 管理页交互特效：hover 光斑 + 点击波纹，均由 CSS 绘制 */

/* 光斑生效的元素 */
const SPOTLIGHT = '.row, .btn, .seg-btn, .nav-item, .emoji-btn, .group-title';
/* 波纹触发的元素 */
const RIPPLE = '.seg-btn, .emoji-btn';

/* 启用特效；body 上委托，波纹只留一个 */
export function initEffects(root: HTMLElement): void {
  root.addEventListener('mousemove', (e) => {
    const host = (e.target as HTMLElement | null)?.closest<HTMLElement>(SPOTLIGHT);
    if (!host) return;
    const rect = host.getBoundingClientRect();
    host.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    host.style.setProperty('--my', `${e.clientY - rect.top}px`);
  });

  root.addEventListener('click', (e) => {
    const host = (e.target as HTMLElement | null)?.closest<HTMLElement>(RIPPLE);
    if (!host) return;
    host.querySelector(':scope > .ripple')?.remove();
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
    window.setTimeout(() => ripple.remove(), 600);
  });
}
