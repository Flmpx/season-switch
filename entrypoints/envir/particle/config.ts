/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import type { Settings, ParticleValue } from '../../../lib/settings';
import { NUMERIC_LIMITS, type ElementDescriptor, type NumericLimit } from './elements';
import { registry } from './registry';

/* 把值夹进区间，非有限值回退到出厂值 */
function clampValue(value: unknown, limit: NumericLimit, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(limit.max, Math.max(limit.min, n));
}

/**
 * 取某元素生效的 速度/大小/数目
 * 缺省时回退描述符 defaults，越界值夹进合法区间
 */
export function effectiveParticleValue(
  desc: ElementDescriptor,
  settings: Settings,
): ParticleValue {
  const stored = settings.particles[desc.id];
  if (!stored) return { ...desc.defaults };
  const countLimit =
    desc.behavior === 'twinkle' ? NUMERIC_LIMITS.countTwinkle : NUMERIC_LIMITS.countFall;
  return {
    speed: clampValue(stored.speed, NUMERIC_LIMITS.speed, desc.defaults.speed),
    size: clampValue(stored.size, NUMERIC_LIMITS.size, desc.defaults.size),
    count: clampValue(stored.count, countLimit, desc.defaults.count),
  };
}

/* 按注册表聚合所有元素的当前值 */
export function getElementConfigs(settings: Settings): Record<string, ParticleValue> {
  const out: Record<string, ParticleValue> = {};
  for (const desc of registry.list()) {
    out[desc.id] = effectiveParticleValue(desc, settings);
  }
  return out;
}
