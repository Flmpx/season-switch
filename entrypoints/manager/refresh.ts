/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 视图刷新钩子：管理页各视图在数据变更后请求重绘当前路由。
// 用独立模块而不是回调参数，避免视图与 router 之间形成循环依赖。

type RefreshHandler = () => void;

let handler: RefreshHandler | null = null;

/* 由 router 注册「重绘当前视图」的实现 */
export function setRefreshHandler(fn: RefreshHandler): void {
  handler = fn;
}

/* 请求重绘当前视图 */
export function requestRefresh(): void {
  handler?.();
}
