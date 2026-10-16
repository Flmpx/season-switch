import { defineConfig } from 'wxt';

export default defineConfig({
  modules: [],
  manifest: {
    name: 'Season Switch',
    description: '四季变幻',
    permissions: ['storage'],
    // 必须声明 action 键（不含 default_popup），否则 chrome.action 为 undefined，
    // background 中 chrome.action.onClicked 会抛错、service worker 注册失败。
    // 点击行为由 background 的 onClicked 监听接管（打开 options.html 新标签页）。
    action: {},
  },
});
