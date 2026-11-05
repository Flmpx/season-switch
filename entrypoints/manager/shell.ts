/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/** 管理页外壳：左侧边栏 + 右侧内容区，负责导航与高亮 */
import { iconSvg } from '../../lib/icons';

/* 管理页路由标识 */
export type ManagerRoute = 'new' | 'mine' | 'detail';

/* 各路由对应的侧边栏高亮项 */
const NAV_OF: Record<ManagerRoute, 'new' | 'mine'> = {
  new: 'new', // 新建页
  mine: 'mine', // 列表页
  detail: 'mine', // 详情归列表
};

/** 侧边栏导航项 */
export const ROUTES: ReadonlyArray<{ id: ManagerRoute; label: string; icon: string }> = [
  { id: 'new', label: '新建粒子', icon: 'plus' }, // 新建页
  { id: 'mine', label: '我的粒子', icon: 'list' }, // 列表页
];

/* 管理页外壳实例 */
export interface Shell {
  content: HTMLElement; // 右侧内容容器
  setActive(route: ManagerRoute): void; // 同步侧边栏高亮
}

/* 构建外壳并绑定导航点击，点击只上报路由 */
export function createShell(root: HTMLElement, onRoute: (route: ManagerRoute) => void): Shell {
  root.classList.add('app');
  root.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-name">Season Switch</span>
        <span class="brand-sub">粒子管理</span>
      </div>
      <nav class="nav">
        ${ROUTES.map(
          (r) =>
            `<button class="nav-item" type="button" data-route="${r.id}"><span class="nav-icon">${iconSvg(r.icon, 18)}</span><span>${r.label}</span></button>`,
        ).join('')}
      </nav>
      <div class="sidebar-foot">自定义粒子与内置粒子</div>
    </aside>
    <main class="content" id="manager-content"></main>
  `;

  const content = root.querySelector<HTMLElement>('#manager-content');
  if (!content) throw new Error('manager content container not found');

  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('.nav-item'));
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route as ManagerRoute | undefined;
      if (route) onRoute(route);
    });
  }

  return {
    content,
    setActive(route) {
      const nav = NAV_OF[route];
      for (const btn of buttons) {
        btn.classList.toggle('active', btn.dataset.route === nav);
      }
    },
  };
}
