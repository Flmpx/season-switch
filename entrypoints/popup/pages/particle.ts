/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { pushPage, popPage } from '../nav';
import { registry } from '../../envir/particle';
import type { Settings } from '../../../lib/settings';
import { renderElementPage } from './element';

/* getContexts 是 Chromium 116+ 才有的 API，Firefox 上不存在 */
interface TabContext {
  tabId: number;
  windowId: number;
  documentUrl?: string;
}

/* 复用已经打开的管理页标签：没有才新建（Firefox 无 getContexts，退化为每次新开） */
async function openManager(): Promise<void> {
  const url = chrome.runtime.getURL('manager.html');
  const runtime = chrome.runtime as unknown as {
    getContexts?: (filter: { contextTypes: string[] }) => Promise<TabContext[]>;
  };

  if (typeof runtime.getContexts === 'function') {
    try {
      const contexts = await runtime.getContexts({ contextTypes: ['TAB'] });
      // 优先按 URL 精确匹配；万一拿不到 documentUrl，扩展在标签页里只打开过管理页，取第一个即可
      const usable = contexts.filter((c) => c.tabId >= 0);
      const hit = usable.find((c) => (c.documentUrl ?? '').startsWith(url)) ?? usable[0];
      if (hit) {
        await chrome.tabs.update(hit.tabId, { active: true });
        if (hit.windowId >= 0) await chrome.windows.update(hit.windowId, { focused: true });
        // 让已打开的管理页跳到「新建粒子」，避免停在上次的位置
        try {
          await chrome.tabs.sendMessage(hit.tabId, { type: 'manager:new' });
        } catch {
          /* 页面还没挂上监听时忽略 */
        }
        return;
      }
    } catch {
      /* 查询失败就退回新建 */
    }
  }

  await chrome.tabs.create({ url });
}

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
    void openManager();
  });
  header.appendChild(addBtn);

  header.querySelector('.back')!.addEventListener('click', () => popPage());
  return page;
}
