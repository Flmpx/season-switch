/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import type { ElementDescriptor, VisibleWindow } from './elements';

const TWINKLE_FLOOR = 0.25; // 入夜/黎明保留的峰值比例，避免刚入夜为空

/** 把小时折回 [0,24)，滑块能选到「24 点」，等价于 0 点 */
function wrapHour(hour: number): number {
  return ((hour % 24) + 24) % 24;
}

/** 当前小时是否落在出现时段内，wrap 表示时段为两点之外 */
export function isVisible(visible: VisibleWindow, hour: number): boolean {
  const { from, to, wrap } = visible;
  if (from === to) return !wrap;
  const h = wrapHour(hour);
  return wrap ? h >= from || h < to : h >= from && h < to;
}

/** 时段长度（小时），跨午夜时按 24 补足 */
function spanOf(visible: VisibleWindow): number {
  const { from, to, wrap } = visible;
  return wrap ? 24 - from + to : Math.max(0, to - from);
}

/** 峰值时刻：非跨午夜取区间中点，跨午夜取午夜 */
function peakOf(visible: VisibleWindow): number {
  const { from, to, wrap } = visible;
  return wrap ? (from + to + 24) / 2 : (from + to) / 2;
}

/** 两个小时之间的环形距离 */
function circularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 24;
  return Math.min(d, 24 - d);
}

/** 按出现时段算闪烁元素的目标数量，越接近峰值越多 */
export function getTwinkleTarget(
  desc: ElementDescriptor,
  hour: number,
  maxCount: number,
): number {
  const h = wrapHour(hour);
  if (!isVisible(desc.visible, h) || maxCount <= 0) return 0;
  const half = Math.max(0.01, spanOf(desc.visible) / 2);
  const dist = circularDistance(h, peakOf(desc.visible));
  return Math.round(maxCount * Math.max(TWINKLE_FLOOR, 1 - dist / half));
}
