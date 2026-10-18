/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { Particle, TwinklingParticle } from './particle';
import { createElement } from './factory';
import type { SeasonWeights } from '../../../lib/season-weights';
import type { ParticleValue } from '../../../lib/settings';
import type { ElementRender } from './elements';
import { registry } from './registry';
import { seasonWeightFor } from './elements';
import { getTwinkleTarget } from './target';

/* 闪烁粒子生成不需要季节权重 */
const ZERO_WEIGHTS: SeasonWeights = { spring: 0, summer: 0, autumn: 0, winter: 0 };

/* 单屏飘落粒子硬上限，避免大图 + 高速率把页面拖垮 */
const DEFAULT_MAX_FALL = 800;

/* 飞出视口左右边界多远后回收 */
const OFFSCREEN_MARGIN = 120;

/* 外观签名，用于判断元素外观是否变过 */
function renderKey(render: ElementRender): string {
  return JSON.stringify(render);
}

/* 粒子统一管理器：生成、更新、绘制与回收 */
export class ParticleManager {
  private fallParticles: Particle[] = []; // 飘落粒子
  private twinkleParticles: TwinklingParticle[] = []; // 闪烁粒子
  private accumulators: Record<string, number> = {}; // 各飘落元素的生成累加器
  private ctx: CanvasRenderingContext2D; // 画布上下文
  private maxFall = DEFAULT_MAX_FALL; // 飘落粒子上限

  private static errorCount = 0; // 当前时间窗内已上报的错误数
  private static windowStartAt = 0; // 当前时间窗起点
  private static readonly MAX_ERROR_LOGS = 20; // 每个时间窗最多上报条数
  private static readonly ERROR_WINDOW_MS = 60_000; // 时间窗长度（毫秒）

  /* 用画布上下文构造管理器 */
  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /* 上报单个粒子或生成的故障，每 60 秒最多 20 条 */
  private handleParticleError(context: string, err: unknown): void {
    const now = Date.now();
    if (now - ParticleManager.windowStartAt > ParticleManager.ERROR_WINDOW_MS) {
      ParticleManager.windowStartAt = now;
      ParticleManager.errorCount = 0;
    }
    if (ParticleManager.errorCount < ParticleManager.MAX_ERROR_LOGS) {
      console.error(`[season-switch] 粒子故障已隔离 (${context}):`, err);
      ParticleManager.errorCount++;
    }
  }

  /* 当前粒子总数 */
  get count(): number {
    return this.fallParticles.length + this.twinkleParticles.length;
  }

  /* 元素被删除或外观变更后，丢弃在飞粒子并清理累加器 */
  sync(): void {
    const alive = (p: Particle): boolean => {
      const desc = registry.get(p.type);
      return !!desc && renderKey(p.render) === renderKey(desc.render);
    };
    this.fallParticles = this.fallParticles.filter(alive);
    this.twinkleParticles = this.twinkleParticles.filter(alive);
    for (const id of Object.keys(this.accumulators)) {
      if (!registry.get(id)) delete this.accumulators[id];
    }
  }

  /* 按各元素的数目生成飘落粒子，仅季节权重大于 0 时生成 */
  spawnStep(
    dt: number,
    weights: SeasonWeights,
    width: number,
    height: number,
    configs: Record<string, ParticleValue>,
  ): void {
    for (const desc of registry.list()) {
      if (desc.behavior !== 'fall') continue;
      const cfg = configs[desc.id];
      if (!cfg) continue;
      if (seasonWeightFor(desc, weights) <= 0) continue;

      this.accumulators[desc.id] = (this.accumulators[desc.id] ?? 0) + (dt * cfg.count) / 60;
      while (this.accumulators[desc.id] >= 1) {
        this.accumulators[desc.id] -= 1;
        let particle: Particle;
        try {
          particle = createElement(desc, width, height, cfg, weights);
        } catch (err) {
          this.handleParticleError(`spawn:${desc.id}`, err);
          this.accumulators[desc.id] = 0;
          break;
        }
        this.fallParticles.push(particle);
      }
    }
  }

  /* 按当前时段与显示程度维持各闪烁元素的目标数量 */
  maintainTwinkles(
    currentHour: number,
    intensity: number,
    width: number,
    height: number,
    configs: Record<string, ParticleValue>,
  ): void {
    for (const desc of registry.list()) {
      if (desc.behavior !== 'twinkle') continue;
      const cfg = configs[desc.id];
      if (!cfg) continue;

      const maxCount = Math.round(cfg.count * Math.min(intensity, 1.5));
      const target = getTwinkleTarget(desc, currentHour, maxCount);
      const list = this.twinkleParticles.filter((p) => p.type === desc.id);

      if (list.length < target) {
        while (list.length < target) {
          let s: TwinklingParticle;
          try {
            s = createElement(desc, width, height, cfg, ZERO_WEIGHTS) as TwinklingParticle;
          } catch (err) {
            this.handleParticleError(`spawn:${desc.id}`, err);
            break;
          }
          this.twinkleParticles.push(s);
          list.push(s);
        }
      } else if (list.length > target) {
        let remove = list.length - target;
        for (let i = this.twinkleParticles.length - 1; i >= 0 && remove > 0; i--) {
          if (this.twinkleParticles[i].type === desc.id) {
            this.twinkleParticles.splice(i, 1);
            remove--;
          }
        }
      }
    }
  }

  /* 每帧更新并绘制所有粒子，逐粒子 try/catch 做故障隔离 */
  step(dt: number, width: number, height: number, intensity: number): void {
    this.enforceCap();
    for (let i = this.fallParticles.length - 1; i >= 0; i--) {
      const p = this.fallParticles[i];
      try {
        p.update(dt, height);
      } catch (err) {
        this.handleParticleError(`update:${p.type}`, err);
        this.fallParticles.splice(i, 1);
        continue;
      }
      if (p.opacity <= 0) {
        this.fallParticles.splice(i, 1);
        continue;
      }
      if (p.x < -OFFSCREEN_MARGIN || p.x > width + OFFSCREEN_MARGIN) {
        this.fallParticles.splice(i, 1);
        continue;
      }
      try {
        p.draw(this.ctx, intensity);
      } catch (err) {
        this.handleParticleError(`draw:${p.type}`, err);
        this.fallParticles.splice(i, 1);
      }
    }
    for (let i = this.twinkleParticles.length - 1; i >= 0; i--) {
      const s = this.twinkleParticles[i];
      try {
        s.update(dt);
      } catch (err) {
        this.handleParticleError(`update:${s.type}`, err);
        this.twinkleParticles.splice(i, 1);
        continue;
      }
      try {
        s.draw(this.ctx, intensity);
      } catch (err) {
        this.handleParticleError(`draw:${s.type}`, err);
        this.twinkleParticles.splice(i, 1);
      }
    }
  }

  /* 超出上限时从最旧的飘落粒子开始淘汰 */
  private enforceCap(): void {
    const over = this.fallParticles.length - this.maxFall;
    if (over > 0) this.fallParticles.splice(0, over);
  }

  /* 清空所有粒子与错误计数 */
  clear(): void {
    this.fallParticles.length = 0;
    this.twinkleParticles.length = 0;
    this.accumulators = {};
    ParticleManager.errorCount = 0;
    ParticleManager.windowStartAt = 0;
  }
}
