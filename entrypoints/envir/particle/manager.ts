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

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
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
        this.fallParticles.push(
          createElement(
            type,
            width,
            height,
            getSizeScale(cfg),
            getSpeedScale(cfg),
            weights,
          ),
        );
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
          const s = createElement(type, width, height, getSizeScale(cfg), 1, weights0());
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
  step(dt: number, height: number, intensity: number): void {
    // 🍃❄️ 飘落粒子：下落 + 摆动 + 着陆渐隐
    for (let i = this.fallParticles.length - 1; i >= 0; i--) {
      const p = this.fallParticles[i];
      p.update(dt, height);
      if (p.opacity <= 0) {
        this.fallParticles.splice(i, 1);
        continue;
      }
      p.draw(this.ctx, intensity);
    }
    // ⭐ 闪烁粒子：仅推进闪烁相位（不动），绘制时计算闪烁透明度
    for (const s of this.twinkleParticles) {
      s.update(dt);
      s.draw(this.ctx, intensity);
    }
  }

  // 清空所有粒子（resize / destroy 时）
  clear(): void {
    this.fallParticles.length = 0;
    this.twinkleParticles.length = 0;
    this.accumulators = {};
  }
}

// 闪烁粒子生成不需要季节权重，传入零权重占位（工厂对 twinkle 不使用 weights）
function weights0(): SeasonWeights {
  return { spring: 0, summer: 0, autumn: 0, winter: 0 };
}
