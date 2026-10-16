/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 工具栏图标点击后打开设置页（options.html），以独立标签页呈现，而非弹出窗口。
// 若设置页已打开则聚焦到该标签页/窗口，避免每次点击都新建一个页面。
// 需移除 popup 入口（manifest 不再含 action.default_popup），onClicked 才会触发。
export default defineBackground(() => {
  chrome.action.onClicked.addListener(() => {
    const optionsUrl = chrome.runtime.getURL('options.html');
    // 查询全部标签页，筛出本扩展自己的 options 页（不读其他站点 URL，无需 tabs 权限）。
    chrome.tabs.query({}, (allTabs) => {
      const existing = allTabs.find((t) => t.url?.startsWith(optionsUrl));
      if (existing) {
        // 已打开：激活该标签并把它所在的窗口提到前台。
        chrome.tabs.update(existing.id!, { active: true });
        chrome.windows.update(existing.windowId, { focused: true });
      } else {
        // 未打开：新建一个 options 标签页。
        chrome.tabs.create({ url: optionsUrl });
      }
    });
  });
});
