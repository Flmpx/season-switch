/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/* 视图刷新钩子：独立模块避免视图与路由循环依赖 */

type RefreshHandler = () => void;

let handler: RefreshHandler | null = null;

/* 由路由层注册重绘实现 */
export function setRefreshHandler(fn: RefreshHandler): void {
  handler = fn;
}

/* 请求重绘当前视图 */
export function requestRefresh(): void {
  handler?.();
}
