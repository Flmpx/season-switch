/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { pushPage, popPage } from '../nav';
import { registry } from '../../envir/particle';
import type { Settings } from '../../../lib/settings';
import { renderElementPage } from './element';

/* 渲染粒子设置页：元素列表，点元素进入其详细设置 */
export function renderParticlePage(settings: Settings): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page';

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML =
    '<button class="back" type="button">返回</button><span class="page-title">粒子</span>';
  page.appendChild(header);

  const body = document.createElement('div');
  body.className = 'page-body';

  for (const desc of registry.list()) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'row';
    row.innerHTML = `<span class="row-label">${desc.icon} ${desc.label}</span><span class="chevron">›</span>`;
    row.addEventListener('click', () => pushPage(renderElementPage(desc.id, settings)));
    body.appendChild(row);
  }

  page.appendChild(body);

  // 「+」：页头右侧，与左侧「返回」对称；在新标签页打开独立的管理页
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'add';
  addBtn.title = '新建粒子';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL('manager.html') });
  });
  header.appendChild(addBtn);

  header.querySelector('.back')!.addEventListener('click', () => popPage());
  return page;
}
