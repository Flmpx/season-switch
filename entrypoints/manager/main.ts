/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { registry } from '../envir/particle';
import type { ElementDescriptor } from '../envir/particle/elements';
import { initEffects } from './effects';
import { setRefreshHandler } from './refresh';
import { createShell, type ManagerRoute, type Shell } from './shell';
import { renderDetailView } from './views/detail';
import { renderMineView } from './views/mine';
import { renderNewElementView } from './views/new-element';

/* 路由：列表、新建、详情三种 */
type Route = { name: 'new' } | { name: 'mine' } | { name: 'detail'; id: string };

const DEFAULT_ROUTE: Route = { name: 'new' };

/* 从 location.hash 解析路由：#/new、#/mine、#/detail/<id> */
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

/* 页面标题 */
function titleOf(route: Route, desc?: ElementDescriptor): string {
  if (route.name === 'new') return '新建粒子 · Season Switch';
  if (route.name === 'mine') return '我的粒子 · Season Switch';
  return `${desc?.label ?? '粒子'} · Season Switch`;
}

let shell: Shell | null = null;

/* 按路由渲染右侧视图 */
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

  // 元素不存在（例如刚被删除）：退回列表
  if (!view) {
    location.hash = '#/mine';
    return;
  }

  shell.content.replaceChildren(view);
  shell.setActive(active);
  document.title = titleOf(route, desc);
}

/* 侧边栏导航：写 hash 后由 hashchange 统一渲染 */
function go(route: ManagerRoute): void {
  const target = route === 'detail' ? '#/mine' : `#/${route}`;
  if (location.hash === target) {
    render(parseRoute());
    return;
  }
  location.hash = target;
}

async function start(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) return;

  // 先加载元素注册表，列表与详情都依赖它
  await registry.init();

  shell = createShell(root, go);
  // 数据变化后（保存、删除、导入）各视图请求重绘当前路由
  setRefreshHandler(() => render(parseRoute()));

  // 聚光灯与波纹：挂在 body 上，视图重绘后依然生效
  initEffects(document.body);

  // popup 的「+」复用本标签页时发来消息，让页面跳到「新建粒子」
  chrome.runtime.onMessage.addListener((message: { type?: string } | null) => {
    if (message?.type === 'manager:new') go('new');
  });

  render(parseRoute());
  window.addEventListener('hashchange', () => render(parseRoute()));
}

start();
