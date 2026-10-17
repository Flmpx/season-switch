/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { registry } from '../envir/particle';
import { createShell, ROUTES, type ManagerRoute, type Shell } from './shell';
import { renderNewElementView } from './views/new-element';
import { renderMineView } from './views/mine';

/* 非法 hash 或缺省时落到的页面 */
const DEFAULT_ROUTE: ManagerRoute = 'new';

/* 从 location.hash 解析路由 */
function routeFromHash(): ManagerRoute {
  const id = location.hash.replace(/^#\/?/, '');
  return ROUTES.some((r) => r.id === id) ? (id as ManagerRoute) : DEFAULT_ROUTE;
}

let shell: Shell | null = null;

/* 按路由渲染右侧视图 */
function render(route: ManagerRoute): void {
  if (!shell) return;
  shell.content.replaceChildren(
    route === 'new' ? renderNewElementView() : renderMineView(),
  );
  shell.setActive(route);
  document.title =
    route === 'new' ? '新建粒子 · Season Switch' : '我的粒子 · Season Switch';
}

/* 切换路由：写 hash 后由 hashchange 统一渲染，避免渲染两条路径 */
function go(route: ManagerRoute): void {
  if (route === routeFromHash()) {
    render(route);
    return;
  }
  location.hash = `#/${route}`;
}

async function start(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) return;

  // 先加载元素注册表，后续视图依赖内置 + 本地元素列表
  await registry.init();

  shell = createShell(root, go);
  render(routeFromHash());
  window.addEventListener('hashchange', () => render(routeFromHash()));
}

start();
