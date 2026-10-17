/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 每个元素的"当前值"：settings.particles 缺省时回退描述符 defaults。
// 读取时再夹一次范围：存储被手改或从旧版本残留越界值时，不至于让粒子数量/速度失控。
import type { Settings, ParticleValue } from '../../../lib/settings';
import { NUMERIC_LIMITS, type ElementDescriptor, type NumericLimit } from './elements';
import { registry } from './registry';

/* 夹进区间；非有限值回退到出厂值 */
function clampValue(value: unknown, limit: NumericLimit, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(limit.max, Math.max(limit.min, n));
}

/* 取某元素当前生效的 速度/大小/数目（缺省回退出厂值，越界值夹进合法区间） */
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

/* 按注册表聚合所有元素的当前值（供 content.ts 使用） */
export function getElementConfigs(settings: Settings): Record<string, ParticleValue> {
  const out: Record<string, ParticleValue> = {};
  for (const desc of registry.list()) {
    out[desc.id] = effectiveParticleValue(desc, settings);
  }
  return out;
}
