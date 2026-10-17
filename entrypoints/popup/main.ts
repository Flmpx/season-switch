/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */
import { loadSettings } from '../../lib/settings';
import { initNav, pushPage } from './nav';
import { initEffects } from './effects';
import { renderMainPage } from './pages/main';

async function start(): Promise<void> {
  const settings = await loadSettings();
  const pagesEl = document.getElementById('pages');
  if (!pagesEl) return;
  initNav(pagesEl);
  pushPage(renderMainPage(settings), false);
  initEffects(document.body); // 交互特效：光标跟随光斑 + 点击波纹
}

start();
