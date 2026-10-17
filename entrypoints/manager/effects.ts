/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 管理页交互特效：hover 光标跟随光斑 + 点击白色波纹（事件委托，挂在页面根上）。
// 光斑用在所有可点元素上；波纹只留在分段按钮与 emoji 格子上——
// 模块化按钮与侧边栏导航上的波纹按反馈去掉了，避免和光斑叠在一起显得吵。
// 光斑与波纹都由 CSS 的 ::after / .ripple 画，这里只负责写入坐标与插入节点。

const SPOTLIGHT = '.row, .btn, .seg-btn, .nav-item, .emoji-btn, .group-title';
const RIPPLE = '.seg-btn, .emoji-btn';

/* 启用交互特效；root 用 document.body，视图重绘后无需重新绑定 */
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
    // 正在动画的波纹最多留一个，连点不会堆出一堆节点
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
