/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */
import { loadSettings } from '../../lib/settings';
import { initNav, pushPage } from './nav';
import { initEffects } from './effects';
import { renderMainPage } from './pages/main';

/* 弹窗入口：加载设置、渲染主页并启用交互特效 */
async function start(): Promise<void> {
  const settings = await loadSettings();
  const pagesEl = document.getElementById('pages');
  if (!pagesEl) return;
  initNav(pagesEl);
  pushPage(renderMainPage(settings), false);
  initEffects(document.body);
}

start();
