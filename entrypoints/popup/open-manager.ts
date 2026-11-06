/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/** 打开管理页时可以直达的视图 */
export type ManagerView = 'new' | 'mine';

/** 标签页上下文，getContexts 仅 Chromium 116+ 支持 */
interface TabContext {
  tabId: number; // 标签页 ID
  windowId: number; // 窗口 ID
  documentUrl?: string; // 页面地址
}

/**
 * 打开管理页：已有标签就切过去并跳到指定视图，没有才新建
 * 只操作扩展自身页面，故不申请 tabs 权限；浏览器不支持 getContexts 时直接新开
 */
export async function openManager(view: ManagerView): Promise<void> {
  const base = chrome.runtime.getURL('manager.html');
  const runtime = chrome.runtime as unknown as {
    getContexts?: (filter: { contextTypes: string[] }) => Promise<TabContext[]>;
  };

  const contexts =
    typeof runtime.getContexts === 'function'
      ? await runtime.getContexts({ contextTypes: ['TAB'] }).catch(() => [] as TabContext[])
      : [];
  const usable = contexts.filter((c) => c.tabId >= 0);
  const hit = usable.find((c) => (c.documentUrl ?? '').startsWith(base)) ?? usable[0];
  if (!hit) {
    await chrome.tabs.create({ url: `${base}#/${view}` });
    return;
  }

  await chrome.tabs.update(hit.tabId, { active: true });
  if (hit.windowId >= 0) await chrome.windows.update(hit.windowId, { focused: true });
  await chrome.tabs.sendMessage(hit.tabId, { type: `manager:${view}` }).catch(() => undefined);
}
