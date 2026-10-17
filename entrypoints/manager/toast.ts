/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/* 轻提示：短暂浮在右下角，2.6 秒后自动消失 */

/* 显示一条提示；kind 为 error 时用警示配色 */
export function toast(message: string, kind: 'info' | 'error' = 'info'): void {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    document.body.appendChild(host);
  }
  const item = document.createElement('div');
  item.className = `toast ${kind}`;
  item.textContent = message;
  host.appendChild(item);
  window.setTimeout(() => item.remove(), 2600);
}
