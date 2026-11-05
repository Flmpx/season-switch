/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { loadSettings } from '../../lib/settings';
import { registry } from '../envir/particle';
import { initNav, pushPage } from './nav';
import { renderMainPage } from './pages/main';

/**
 * 弹窗入口：初始化注册表与设置，渲染主页并挂上导航栈
 */
async function start(): Promise<void> {
  await registry.init();
  const settings = await loadSettings();
  const pagesEl = document.getElementById('pages');
  if (!pagesEl) return;
  initNav(pagesEl);
  pushPage(renderMainPage(settings), false);
}

start();
