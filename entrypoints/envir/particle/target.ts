/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import type { ElementDescriptor } from './elements';

/* 入夜/黎明时保留的峰值比例，避免刚入夜一颗都没有 */
const TWINKLE_FLOOR = 0.25;

/* 按可见时段算 twinkle 元素的目标数量，跨午夜以午夜为峰值 */
export function getTwinkleTarget(
  desc: ElementDescriptor,
  hour: number,
  maxCount: number,
): number {
  const from = desc.target?.visibleFrom ?? 0;
  const to = desc.target?.visibleTo ?? 0;
  const active = from <= to ? hour >= from && hour <= to : hour >= from || hour <= to;
  if (!active || maxCount <= 0) return 0;
  const half = from <= to ? (to - from) / 2 : Math.min(24 - from, to);
  const dist = from <= to ? Math.abs(hour - (from + to) / 2) : Math.min(hour, 24 - hour);
  return Math.round(maxCount * Math.max(TWINKLE_FLOOR, 1 - dist / half));
}
