// 🧩 粒子统一管理器
// 统一管理所有粒子的生成、更新（飘落/闪烁）、绘制与消失：
//   - 飘落粒子（fall 行为）：按生成速率与季节权重生成，下落+摆动+着陆渐隐
//   - 星光类（twinkle 行为）：按当前时段维持目标数量，静止+闪烁
// 元素类型完全由 elements.json 驱动：新增元素只需编辑 JSON，这里自动遍历处理。
// 供 content.ts 协调者调用，使主循环的物理与生命周期逻辑内聚于此。

import { Particle } from './particle';
import { TwinklingParticle } from './particle';
import { createElement } from './factory';
import type { SeasonWeights } from '../../../lib/season-weights';
import type { ElementConfig } from '../../../lib/settings';
import {
  ELEMENT_TYPES,
  getElementDescriptor,
  seasonWeightFor,
} from './elements';
import {
  getSizeScale,
  getSpeedScale,
  getCountPerMinute,
  getTwinkleMaxCount,
  getTwinkleTarget,
} from './index';

export class ParticleManager {
  private fallParticles: Particle[] = []; // 飘落粒子（任意 fall 行为元素）
  private twinkleParticles: TwinklingParticle[] = []; // 闪烁粒子（任意 twinkle 行为元素）
  private accumulators: Record<string, number> = {}; // 各 fall 元素的生成累加器（秒）
  private ctx: CanvasRenderingContext2D;

  // 故障隔离：单个粒子的 update/draw 异常不应中断整个渲染循环或影响其他粒子。
  // 通过限制错误日志数量避免反复出错的粒子刷屏；clear() 时重置计数。
  private static errorCount = 0;
  private static readonly MAX_ERROR_LOGS = 20;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // 单个粒子/生成失败时集中上报，并限制日志数量
  private handleParticleError(context: string, err: unknown): void {
    if (ParticleManager.errorCount < ParticleManager.MAX_ERROR_LOGS) {
      console.error(`[season-switch] 粒子故障已隔离 (${context}):`, err);
      ParticleManager.errorCount++;
    }
  }

  // 当前粒子总数（调试/状态用）
  get count(): number {
    return this.fallParticles.length + this.twinkleParticles.length;
  }

  // 按元素分别的生成速率生成新飘落粒子
  // 遍历所有 fall 行为元素：仅在对应季节权重 > 0 时生成该元素（避免无关季节空转）
  spawnStep(
    dt: number,
    weights: SeasonWeights,
    width: number,
    height: number,
    configs: Record<string, ElementConfig>,
  ): void {
    for (const type of ELEMENT_TYPES) {
      const desc = getElementDescriptor(type);
      if (!desc || desc.behavior !== 'fall') continue;
      const cfg = configs[type];
      if (!cfg) continue;
      if (seasonWeightFor(desc, weights) <= 0) continue;

      this.accumulators[type] = (this.accumulators[type] ?? 0) + (dt * getCountPerMinute(cfg)) / 60;
      while (this.accumulators[type] >= 1) {
        this.accumulators[type] -= 1;
        let particle: Particle;
        try {
          particle = createElement(
            type,
            width,
            height,
            getSizeScale(cfg),
            getSpeedScale(cfg),
            weights,
          );
        } catch (err) {
          // 故障隔离：单个元素生成失败不应中断其他元素的生成
          this.handleParticleError(`spawn:${type}`, err);
          this.accumulators[type] = 0; // 清零累加器，防止故障元素无限循环
          break;
        }
        this.fallParticles.push(particle);
      }
    }
  }

  // ⭐ 按当前时段与显示程度维持各 twinkle 元素的目標数量
  // 增加时保留原有粒子；减少时随机删除多余粒子
  maintainTwinkles(
    currentHour: number,
    intensity: number,
    width: number,
    height: number,
    configs: Record<string, ElementConfig>,
  ): void {
    for (const type of ELEMENT_TYPES) {
      const desc = getElementDescriptor(type);
      if (!desc || desc.behavior !== 'twinkle') continue;
      const cfg = configs[type];
      if (!cfg) continue;

      const maxCount = Math.round(getTwinkleMaxCount(cfg) * Math.min(intensity, 1.5));
      const target = getTwinkleTarget(desc, currentHour, maxCount);
      const list = this.twinkleParticles.filter((p) => p.type === type);

      if (list.length < target) {
        while (list.length < target) {
          let s: TwinklingParticle;
          try {
            s = createElement(type, width, height, getSizeScale(cfg), 1, weights0());
          } catch (err) {
            // 故障隔离：单个元素生成失败不应中断其他元素的维持
            this.handleParticleError(`spawn:${type}`, err);
            break;
          }
          this.twinkleParticles.push(s);
          list.push(s);
        }
      } else if (list.length > target) {
        let remove = list.length - target;
        for (let i = this.twinkleParticles.length - 1; i >= 0 && remove > 0; i--) {
          if (this.twinkleParticles[i].type === type) {
            this.twinkleParticles.splice(i, 1);
            remove--;
          }
        }
      }
    }
  }

  // 每帧：更新（飘落/闪烁）+ 绘制 + 移除已消失粒子
  // 故障隔离：每个粒子的 update/draw 独立 try/catch，
  // 单个粒子异常仅移除该粒子，绝不中断循环或波及其他粒子。
  step(dt: number, height: number, intensity: number): void {
    // 🍃❄️ 飘落粒子：下落 + 摆动 + 着陆渐隐
    for (let i = this.fallParticles.length - 1; i >= 0; i--) {
      const p = this.fallParticles[i];
      try {
        p.update(dt, height);
      } catch (err) {
        this.handleParticleError(`update:${p.type}`, err);
        this.fallParticles.splice(i, 1); // 移除故障粒子，避免每帧重复抛错
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
    // ⭐ 闪烁粒子：仅推进闪烁相位（不动），绘制时计算闪烁透明度
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

  // 清空所有粒子（resize / destroy 时）
  clear(): void {
    this.fallParticles.length = 0;
    this.twinkleParticles.length = 0;
    this.accumulators = {};
    ParticleManager.errorCount = 0; // 重置故障日志计数
  }
}

// 闪烁粒子生成不需要季节权重，传入零权重占位（工厂对 twinkle 不使用 weights）
function weights0(): SeasonWeights {
  return { spring: 0, summer: 0, autumn: 0, winter: 0 };
}
