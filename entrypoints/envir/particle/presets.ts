/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import type { ElementBehavior, ElementDescriptor } from './elements';

/* 可调的三个轴 */
export type Axis = 'speed' | 'size' | 'count';

/* 速度档位名称（对应 presets.speed 顺序） */
export const SPEED_LABELS = ['慢', '中', '快'] as const;
/* 大小档位名称（对应 presets.size 顺序） */
export const SIZE_LABELS = ['小', '中', '大'] as const;
/* 数目档位名称（对应 presets.count 顺序） */
export const COUNT_LABELS = ['微量', '少量', '中等', '大量'] as const;

/* 某轴在该行为下是否可见（twinkle 没有速度） */
export function axisVisible(axis: Axis, behavior: ElementBehavior): boolean {
  return !(axis === 'speed' && behavior === 'twinkle');
}

/* 某轴的档位名称 */
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

/* 取某轴的档位值数组，用户元素可自带任意档位 */
export function axisPresets(axis: Axis, desc: ElementDescriptor): number[] {
  return desc.presets[axis];
}

/* 某轴的单位 */
export function axisUnit(axis: Axis, behavior: ElementBehavior): string {
  if (axis === 'speed') return 'px/s';
  if (axis === 'size') return 'px';
  return behavior === 'twinkle' ? '个' : '个/分钟';
}

/* 某轴滑块的步长 */
export function axisStep(axis: Axis): number {
  return axis === 'size' ? 0.5 : 1;
}

/* 某轴滑块的上限 */
export function axisMax(axis: Axis, behavior: ElementBehavior): number {
  if (axis === 'speed') return 200;
  if (axis === 'size') return 120;
  return behavior === 'twinkle' ? 300 : 360;
}
