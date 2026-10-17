/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 粒子统一管理器：生成、更新（飘落/闪烁）、绘制与消失，元素由注册表驱动。
import { Particle, TwinklingParticle } from './particle';
import { createElement } from './factory';
import type { SeasonWeights } from '../../../lib/season-weights';
import type { ParticleValue } from '../../../lib/settings';
import { registry } from './registry';
import { seasonWeightFor } from './elements';
import { getTwinkleTarget } from './target';

// 闪烁粒子生成不需要季节权重
const ZERO_WEIGHTS: SeasonWeights = { spring: 0, summer: 0, autumn: 0, winter: 0 };

export class ParticleManager {
  private fallParticles: Particle[] = []; // 飘落粒子（任意 fall 元素）
  private twinkleParticles: TwinklingParticle[] = []; // 闪烁粒子（任意 twinkle 元素）
  private accumulators: Record<string, number> = {}; // 各 fall 元素的生成累加器（秒）
  private ctx: CanvasRenderingContext2D; // 画布上下文

  // 故障隔离：限制错误日志数量避免刷屏，clear() 时重置
  private static errorCount = 0;
  private static readonly MAX_ERROR_LOGS = 20;

  /* 用画布上下文构造管理器 */
  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /* 单个粒子/生成失败时集中上报，并限制日志数量 */
  private handleParticleError(context: string, err: unknown): void {
    if (ParticleManager.errorCount < ParticleManager.MAX_ERROR_LOGS) {
      console.error(`[season-switch] 粒子故障已隔离 (${context}):`, err);
      ParticleManager.errorCount++;
    }
  }

  /* 当前粒子总数（调试/状态用） */
  get count(): number {
    return this.fallParticles.length + this.twinkleParticles.length;
  }

  /* 按元素分别的生成速率生成飘落粒子；仅对应季节权重>0 时生成 */
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

  /* 按当前时段与显示程度维持各 twinkle 元素的目标数量 */
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

  /* 每帧更新+绘制所有粒子，逐粒子 try/catch 故障隔离 */
  step(dt: number, height: number, intensity: number): void {
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

  /* 清空所有粒子（resize / destroy / 元素被删除时） */
  clear(): void {
    this.fallParticles.length = 0;
    this.twinkleParticles.length = 0;
    this.accumulators = {};
    ParticleManager.errorCount = 0;
  }
}
