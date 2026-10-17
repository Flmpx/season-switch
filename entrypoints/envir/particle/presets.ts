/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 档位约定：慢中快 / 小中大 / 微量少量中等大量 → 描述符里 presets 数组的下标。
// 当前值恰好等于某档 → 点亮该档；否则视为"自定义"。
import type { ElementBehavior, ElementDescriptor } from './elements';

export type Axis = 'speed' | 'size' | 'count';

// 各轴的档位名称（按描述符 presets 数组顺序）
export const SPEED_LABELS = ['慢', '中', '快'] as const;
export const SIZE_LABELS = ['小', '中', '大'] as const;
export const COUNT_LABELS = ['微量', '少量', '中等', '大量'] as const;

/* 某轴是否在该行为下可见（twinkle 无速度） */
export function axisVisible(axis: Axis, behavior: ElementBehavior): boolean {
  return !(axis === 'speed' && behavior === 'twinkle');
}

/* 某轴的档位标签 */
export function axisLabels(axis: Axis): readonly string[] {
  if (axis === 'speed') return SPEED_LABELS;
  if (axis === 'size') return SIZE_LABELS;
  return COUNT_LABELS;
}

/* 某轴的中文标题 */
export function axisTitle(axis: Axis): string {
  if (axis === 'speed') return '速度';
  if (axis === 'size') return '大小';
  return '数目';
}

/* 某轴的档位值数组（描述符） */
export function axisPresets(axis: Axis, desc: ElementDescriptor): number[] {
  if (axis === 'speed') return desc.speedPresets;
  if (axis === 'size') return desc.sizePresets;
  return desc.countPresets;
}

/* 某轴单位 */
export function axisUnit(axis: Axis, behavior: ElementBehavior): string {
  if (axis === 'speed') return 'px/s';
  if (axis === 'size') return 'px';
  return behavior === 'twinkle' ? '个' : '个/分钟';
}

/* 某轴滑块步长 */
export function axisStep(axis: Axis): number {
  return axis === 'size' ? 0.5 : 1;
}

/* 某轴滑块上限 */
export function axisMax(axis: Axis, behavior: ElementBehavior): number {
  if (axis === 'speed') return 200;
  if (axis === 'size') return 120;
  return behavior === 'twinkle' ? 300 : 1800;
}

/* 返回档位下标；不匹配返回 -1（即"自定义"） */
export function matchPreset(value: number, presets: number[]): number {
  return presets.findIndex((p) => p === value);
}

/* 取某档位值（越界回退到第一个） */
export function presetValue(index: number, presets: number[]): number {
  return presets[index] ?? presets[0];
}
