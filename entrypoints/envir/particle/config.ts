/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 每个元素的"当前值"：settings.particles 缺省时回退描述符 defaults。
import type { Settings, ParticleValue } from '../../../lib/settings';
import type { ElementDescriptor } from './elements';
import { registry } from './registry';

/* 取某元素当前生效的 速度/大小/数目（缺省回退出厂值） */
export function effectiveParticleValue(
  desc: ElementDescriptor,
  settings: Settings,
): ParticleValue {
  return settings.particles[desc.id] ?? { ...desc.defaults };
}

/* 按注册表聚合所有元素的当前值（供 content.ts 使用） */
export function getElementConfigs(settings: Settings): Record<string, ParticleValue> {
  const out: Record<string, ParticleValue> = {};
  for (const desc of registry.list()) {
    out[desc.id] = effectiveParticleValue(desc, settings);
  }
  return out;
}
