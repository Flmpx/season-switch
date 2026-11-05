/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import type { Settings, AxisChoice, ParticleValue } from '../../../lib/settings';
import { NUMERIC_LIMITS, middlePresetIndex, type ElementDescriptor, type NumericLimit } from './elements';
import { registry } from './registry';

/* 渲染时用的具体数值，由档位或自定义值解析而来 */
export interface ResolvedValue {
  speed: number; // px/s，闪烁元素不使用
  size: number; // px
  count: number; // fall 为个/分钟，twinkle 为午夜峰值颗数
}

/* 把值夹进区间 */
function clamp(value: number, limit: NumericLimit): number {
  return Math.min(limit.max, Math.max(limit.min, value));
}

/* 单个轴的选择解析成数值：档位取档位表里的值，自定义取自定义值 */
export function choiceValue(
  choice: AxisChoice | undefined,
  presets: number[],
  limit: NumericLimit,
): number {
  if (choice && choice.kind === 'custom') {
    return clamp(Number.isFinite(choice.value) ? choice.value : limit.min, limit);
  }
  if (presets.length === 0) return clamp(limit.min, limit);
  const index = choice && choice.kind === 'preset' ? choice.index : middlePresetIndex(presets.length);
  return clamp(presets[Math.min(presets.length - 1, Math.max(0, index))], limit);
}

/* 未存储时的初始选择：每轴都落在中间档 */
export function defaultParticleValue(desc: ElementDescriptor): ParticleValue {
  const mid = (list: number[]): AxisChoice => ({
    kind: 'preset',
    index: middlePresetIndex(list.length),
  });
  return {
    speed: mid(desc.presets.speed),
    size: mid(desc.presets.size),
    count: mid(desc.presets.count),
  };
}

/**
 * 取某元素生效的速度/大小/数目
 * 存储里没有记录时用中间档，越界值夹进合法区间
 */
export function resolveParticleValue(
  desc: ElementDescriptor,
  settings: Settings,
): ResolvedValue {
  const stored = settings.particles[desc.id];
  const countLimit =
    desc.behavior === 'twinkle' ? NUMERIC_LIMITS.countTwinkle : NUMERIC_LIMITS.countFall;
  return {
    speed: choiceValue(stored?.speed, desc.presets.speed, NUMERIC_LIMITS.speed),
    size: choiceValue(stored?.size, desc.presets.size, NUMERIC_LIMITS.size),
    count: choiceValue(stored?.count, desc.presets.count, countLimit),
  };
}

/* 按注册表聚合所有元素的当前值 */
export function getElementConfigs(settings: Settings): Record<string, ResolvedValue> {
  const out: Record<string, ResolvedValue> = {};
  for (const desc of registry.list()) {
    out[desc.id] = resolveParticleValue(desc, settings);
  }
  return out;
}
