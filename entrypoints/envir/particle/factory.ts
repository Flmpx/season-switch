/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { Particle, TwinklingParticle } from './particle';
import type { ElementDescriptor, Season } from './elements';
import type { ResolvedValue } from './config';
import type { SeasonWeights } from '../../../lib/season-weights';

/** 区间随机 */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** 从数组里随机取一个 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 夹到 0-1 */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** 在基准值 ±jitter 比例内随机 */
function jittered(base: number, jitter: number): number {
  const j = Math.max(0, Math.min(1, jitter));
  return base * (1 - j + Math.random() * 2 * j);
}

/** 取色：有季节色板就按季节权重随机，否则用固定色 */
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

/**
 * 按描述符与当前值构造一个粒子实例
 * 位置落在设定区域内，各属性在基准值附近随机抖动
 */
export function createElement(
  desc: ElementDescriptor,
  width: number,
  height: number,
  value: ResolvedValue,
  weights: SeasonWeights,
): Particle {
  const j = desc.motion.jitter;
  const rx = desc.region.x * width;
  const ry = desc.region.y * height;
  const rw = desc.region.w * width;
  const rh = desc.region.h * height;

  if (desc.behavior === 'twinkle') {
    return new TwinklingParticle({
      type: desc.id,
      render: desc.render,
      x: rx + Math.random() * rw,
      y: ry + Math.random() * rh,
      size: jittered(value.size, j),
      color: desc.color ?? '#FFFAD6',
      speedY: 0,
      rotation: 0,
      rotSpeed: 0,
      opacity: 1,
      wobblePhase: 0,
      wobbleSpeed: 0,
      wobbleAmp: 0,
      bottom: ry + rh,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: desc.motion.twinkleSpeed,
      baseOpacity: clamp01(jittered(desc.motion.opacity, j)),
    });
  }

  return new Particle({
    type: desc.id,
    render: desc.render,
    x: rx + Math.random() * rw,
    y: ry - 20 - rand(0, 80),
    size: jittered(value.size, j),
    speedY: jittered(value.speed, j),
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: desc.motion.rotationSpeed,
    opacity: clamp01(jittered(desc.motion.opacity, j)),
    color: resolveColor(desc, weights),
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: desc.motion.wobbleSpeed,
    wobbleAmp: desc.motion.wobbleAmp,
    bottom: ry + rh,
  });
}
