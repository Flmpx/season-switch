/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { registry } from '../envir/particle';
import type { ElementDescriptor } from '../envir/particle/elements';
import { setRefreshHandler } from './refresh';
import { createShell, type ManagerRoute, type Shell } from './shell';
import { renderDetailView } from './views/detail';
import { renderMineView } from './views/mine';
import { renderNewElementView } from './views/new-element';

/* 页面路由：新建、列表、详情 */
type Route = { name: 'new' } | { name: 'mine' } | { name: 'detail'; id: string };

/* 默认落到新建页 */
const DEFAULT_ROUTE: Route = { name: 'new' };

/* 解析 location.hash 路由 */
function parseRoute(): Route {
  const raw = location.hash.replace(/^#\/?/, '');
  const slash = raw.indexOf('/');
  const head = slash >= 0 ? raw.slice(0, slash) : raw;
  const id = slash >= 0 ? raw.slice(slash + 1) : '';
  if (head === 'mine') return { name: 'mine' };
  if (head === 'detail' && id) return { name: 'detail', id };
  if (head === 'new') return { name: 'new' };
  return DEFAULT_ROUTE;
}

/* 生成页面标题 */
function titleOf(route: Route, desc?: ElementDescriptor): string {
  if (route.name === 'new') return '新建粒子 · Season Switch';
  if (route.name === 'mine') return '我的粒子 · Season Switch';
  return `${desc?.label ?? '粒子'} · Season Switch`;
}

let shell: Shell | null = null;

/* 渲染路由视图，元素失效则退回列表 */
function render(route: Route): void {
  if (!shell) return;

  let view: HTMLElement | null = null;
  let active: ManagerRoute = 'new';
  let desc: ElementDescriptor | undefined;

  if (route.name === 'new') {
    view = renderNewElementView();
    active = 'new';
  } else if (route.name === 'mine') {
    view = renderMineView();
    active = 'mine';
  } else {
    desc = registry.get(route.id);
    view = renderDetailView(route.id);
    active = 'mine';
  }

  if (!view) {
    location.hash = '#/mine';
    return;
  }

  shell.content.replaceChildren(view);
  shell.setActive(active);
  document.title = titleOf(route, desc);
}

/* 写 hash 跳转，统一由 hashchange 渲染 */
function go(route: ManagerRoute): void {
  const target = route === 'detail' ? '#/mine' : `#/${route}`;
  if (location.hash === target) {
    render(parseRoute());
    return;
  }
  location.hash = target;
}

/* 启动管理页：注册表、外壳、特效与消息监听 */
async function start(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) return;

  await registry.init();

  shell = createShell(root, go);
  setRefreshHandler(() => render(parseRoute()));

  chrome.runtime.onMessage.addListener((message: { type?: string } | null) => {
    if (message?.type === 'manager:new') go('new');
  });

  render(parseRoute());
  window.addEventListener('hashchange', () => render(parseRoute()));
}

start();
