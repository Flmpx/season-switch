/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */
import { loadSettings } from '../../lib/settings';
import { initNav, pushPage } from './nav';
import { renderMainPage } from './pages/main';

async function start(): Promise<void> {
  const settings = await loadSettings();
  const pagesEl = document.getElementById('pages');
  if (!pagesEl) return;
  initNav(pagesEl);
  pushPage(renderMainPage(settings), false);
}

start();
