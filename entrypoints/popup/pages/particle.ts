/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { pushPage, popPage } from '../nav';
import { cardRow, pageShell } from '../ui';
import { axisUnit, registry, resolveParticleValue } from '../../envir/particle';
import type { Settings } from '../../../lib/settings';
import { renderElementPage } from './element';
import { iconNode } from '../../../lib/icons';

/** 标签页上下文；getContexts 仅 Chromium 116+ 支持 */
interface TabContext {
  tabId: number; // 标签页 ID
  windowId: number; // 窗口 ID
  documentUrl?: string; // 页面地址
}

/**
 * 复用已打开的管理页标签，没有才新建
 * 只操作扩展自身页面，故不申请 tabs 权限；浏览器不支持 getContexts 时直接新开
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

/**
 * 渲染粒子列表页：每个元素一行，右上「+」在新标签页打开管理页
 */
export function renderParticlePage(settings: Settings): HTMLElement {
  const shell = pageShell('粒子', true, () => popPage());

  for (const desc of registry.list()) {
    const value = resolveParticleValue(desc, settings);
    const behavior = desc.behavior === 'fall' ? '飘落' : '闪烁';
    const card = document.createElement('div');
    card.className = 'card';
    card.appendChild(
      cardRow({
        icon: desc.icon,
        label: desc.label,
        desc: `${behavior} · ${value.size}px · 数量 ${value.count}${axisUnit('count', desc.behavior)}`,
        right: 'chevron',
        onClick: () => pushPage(renderElementPage(desc.id, settings)),
      }),
    );
    shell.body.appendChild(card);
  }

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'add';
  addButton.title = '新建粒子';
  addButton.appendChild(iconNode('plus', 16));
  addButton.addEventListener('click', () => {
    void openManager();
  });
  shell.header.appendChild(addButton);

  return shell.page;
}
