/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { pushPage, popPage } from '../nav';
import { registry } from '../../envir/particle';
import type { Settings } from '../../../lib/settings';
import { renderElementPage } from './element';

/* 标签页上下文；getContexts 仅 Chromium 116+ 支持 */
interface TabContext {
  tabId: number; // 标签页 ID
  windowId: number; // 窗口 ID
  documentUrl?: string; // 页面地址
}

/**
 * 复用已打开的管理页标签，没有才新建。
 * 只操作扩展自身页面，故不申请 tabs 权限；Firefox 无 getContexts，退化为新开。
 * 优先按 URL 精确匹配，取不到地址时取第一个可用标签。
 */
async function openManager(): Promise<void> {
  const url = chrome.runtime.getURL('manager.html');
  const runtime = chrome.runtime as unknown as {
    getContexts?: (filter: { contextTypes: string[] }) => Promise<TabContext[]>;
  };

  const contexts =
    typeof runtime.getContexts === 'function'
      ? await runtime.getContexts({ contextTypes: ['TAB'] }).catch(() => [] as TabContext[])
      : [];
  const usable = contexts.filter((c) => c.tabId >= 0);
  const hit = usable.find((c) => (c.documentUrl ?? '').startsWith(url)) ?? usable[0];
  if (!hit) {
    await chrome.tabs.create({ url });
    return;
  }

  await chrome.tabs.update(hit.tabId, { active: true });
  if (hit.windowId >= 0) await chrome.windows.update(hit.windowId, { focused: true });
  await chrome.tabs.sendMessage(hit.tabId, { type: 'manager:new' }).catch(() => undefined);
}

/* 渲染粒子列表页，右上「+」在新标签页打开管理页 */
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

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'add';
  addBtn.title = '新建粒子';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', () => {
    void openManager();
  });
  header.appendChild(addBtn);

  header.querySelector('.back')!.addEventListener('click', () => popPage());
  return page;
}
