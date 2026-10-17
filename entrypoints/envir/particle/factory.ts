/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 数据驱动粒子工厂：读描述符 + 当前值构造粒子实例。当前值（速度/大小）作为基准，
// 每个粒子在该基准 ±jitter 内随机；颜色由描述符色板或固定色决定。
import { FallingParticle, TwinklingParticle, type Particle } from './particle';
import type { ElementDescriptor, Season } from './elements';
import type { ParticleValue } from '../../../lib/settings';
import type { SeasonWeights } from '../../../lib/season-weights';

/* 区间随机 */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/* 从数组随机取一个 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* 限制到 [0,1] */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/* 在基准值 ±jitter 内随机 */
function jittered(base: number, jitter: number): number {
  const j = Math.max(0, Math.min(1, jitter));
  return base * (1 - j + Math.random() * 2 * j);
}

/* 取色：优先季节色板（按权重随机），否则固定色 */
function resolveColor(desc: ElementDescriptor, weights: SeasonWeights): string {
  let color = desc.color ?? '#FFFFFF';
  if (desc.palettes) {
    const seasons: Season[] =
      desc.seasons.length > 0 ? desc.seasons : (Object.keys(desc.palettes) as Season[]);
    const parts = seasons
      .map((s) => ({ s, w: weights[s] ?? 0 }))
      .filter((p) => p.w > 0);
    const total = parts.reduce((a, p) => a + p.w, 0);
    if (total > 0) {
      let r = Math.random() * total;
      let chosen = parts[0].s;
      for (const p of parts) {
        if (r < p.w) {
          chosen = p.s;
          break;
        }
        r -= p.w;
      }
      const pal = desc.palettes[chosen] ?? desc.palettes[seasons[0]];
      if (pal && pal.length) color = pick(pal);
    }
  }
  return color;
}

/* 按描述符 + 当前值构造一个粒子实例 */
export function createElement(
  desc: ElementDescriptor,
  width: number,
  height: number,
  value: ParticleValue,
  weights: SeasonWeights,
): Particle {
  const j = desc.motion.jitter;

  if (desc.behavior === 'twinkle') {
    const regionY = desc.target?.region === 'top-third' ? height / 3 : height;
    return new TwinklingParticle({
      type: desc.id,
      render: desc.render,
      x: Math.random() * width,
      y: Math.random() * regionY,
      size: jittered(value.size, j),
      color: desc.color ?? '#FFFAD6',
      speedY: 0,
      rotation: 0,
      rotSpeed: 0,
      opacity: 1,
      wobblePhase: 0,
      wobbleSpeed: 0,
      wobbleAmp: 0,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: desc.motion.twinkleSpeed,
      baseOpacity: clamp01(jittered(desc.motion.opacity, j)),
    });
  }

  return new FallingParticle({
    type: desc.id,
    render: desc.render,
    x: Math.random() * width,
    y: -20 - Math.random() * height,
    size: jittered(value.size, j),
    speedY: jittered(value.speed, j),
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: desc.motion.rotationSpeed,
    opacity: clamp01(jittered(desc.motion.opacity, j)),
    color: resolveColor(desc, weights),
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: desc.motion.wobbleSpeed,
    wobbleAmp: desc.motion.wobbleAmp,
  });
}
