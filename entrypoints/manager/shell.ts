/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/* 管理页外壳：左侧固定侧边栏 + 右侧内容区，负责导航按钮与当前路由高亮 */

export type ManagerRoute = 'new' | 'mine';

export const ROUTES: ReadonlyArray<{ id: ManagerRoute; label: string; icon: string }> = [
  { id: 'new', label: '新建粒子', icon: '＋' },
  { id: 'mine', label: '我的粒子', icon: '☰' },
];

export interface Shell {
  /** 右侧内容容器，视图挂载于此 */
  content: HTMLElement;
  /** 高亮当前路由对应的导航按钮 */
  setActive(route: ManagerRoute): void;
}

/* 构建外壳并绑定导航点击；点击只上报路由，由调用方决定如何渲染 */
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
            `<button class="nav-item" type="button" data-route="${r.id}"><span class="nav-icon">${r.icon}</span><span>${r.label}</span></button>`,
        ).join('')}
      </nav>
      <div class="sidebar-foot">本地粒子元素与内置粒子元素</div>
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
      for (const btn of buttons) {
        btn.classList.toggle('active', btn.dataset.route === route);
      }
    },
  };
}
