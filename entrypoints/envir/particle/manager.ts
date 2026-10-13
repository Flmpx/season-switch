// 🧩 粒子统一管理器
// 统一管理所有粒子的生成、更新（飘落/闪烁）、绘制与消失：
//   - 飘落粒子（leaf / snow）：按生成速率与季节权重生成，下落+摆动+着陆渐隐
//   - 星光（star / TwinklingParticle）：按当前时段维持目标数量，静止+闪烁
// 供 content.ts 协调者调用，使主循环的物理与生命周期逻辑内聚于此。

import { Particle } from './particle';
import { TwinklingParticle } from './particle/particle';
import { createLeaf } from '../leaf';
import { createSnow } from '../snow';
import { createStar, getStarTargetCount } from '../star';
import type { SeasonWeights } from '../../../lib/season-weights';
import type { ElementConfig } from '../../../lib/settings';
import {
  getSizeScale,
  getSpeedScale,
  getCountPerMinute,
  getStarMaxCount,
} from './index';

export class ParticleManager {
  private particles: Particle[] = []; // 飘落粒子（leaf / snow）
  private stars: TwinklingParticle[] = []; // 星光（静止 + 闪烁）
  private leafAccumulator = 0; // 叶子生成累加器（秒）
  private snowAccumulator = 0; // 雪花生成累加器（秒）
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // 当前粒子总数（调试/状态用）
  get count(): number {
    return this.particles.length + this.stars.length;
  }

  // 按元素分别的生成速率生成新飘落粒子
  // 叶子与雪花各自独立累加器与速率（支持两种元素数目分别设置）
  // 仅在对应季节权重 > 0 时生成该元素，避免无关季节空转
  spawnStep(
    dt: number,
    weights: SeasonWeights,
    width: number,
    height: number,
    leafCfg: ElementConfig,
    snowCfg: ElementConfig,
  ): void {
    const leafWeight = weights.spring + weights.summer + weights.autumn;
    const snowWeight = weights.winter;

    // 🍃 叶子
    if (leafWeight > 0) {
      this.leafAccumulator += (dt * getCountPerMinute(leafCfg)) / 60;
      while (this.leafAccumulator >= 1) {
        this.leafAccumulator -= 1;
        this.particles.push(
          createLeaf(
            width,
            height,
            getSizeScale(leafCfg),
            getSpeedScale(leafCfg),
            weights,
          ),
        );
      }
    }

    // ❄️ 雪花
    if (snowWeight > 0) {
      this.snowAccumulator += (dt * getCountPerMinute(snowCfg)) / 60;
      while (this.snowAccumulator >= 1) {
        this.snowAccumulator -= 1;
        this.particles.push(
          createSnow(width, height, getSizeScale(snowCfg), getSpeedScale(snowCfg)),
        );
      }
    }
  }

  // ⭐ 按当前时段与显示程度维持星光目标数量
  // 星光午夜最大数量由 starCfg 决定（支持按元素设置）
  // 增加时保留原有星光；减少时随机删除多余星光
  maintainStars(
    currentHour: number,
    intensity: number,
    width: number,
    height: number,
    starCfg: ElementConfig,
  ): void {
    const maxStars = Math.round(getStarMaxCount(starCfg) * Math.min(intensity, 1.5));
    const target = getStarTargetCount(currentHour, maxStars);
    if (this.stars.length < target) {
      while (this.stars.length < target) {
        this.stars.push(createStar(width, height, getSizeScale(starCfg)));
      }
    } else if (this.stars.length > target) {
      while (this.stars.length > target) {
        const idx = Math.floor(Math.random() * this.stars.length);
        this.stars.splice(idx, 1);
      }
    }
  }

  // 每帧：更新（飘落/闪烁）+ 绘制 + 移除已消失粒子
  step(dt: number, height: number, intensity: number): void {
    // 🍃❄️ 飘落粒子：下落 + 摆动 + 着陆渐隐
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt, height);
      if (p.opacity <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.draw(this.ctx, intensity);
    }
    // ⭐ 星光：仅推进闪烁相位（不动），绘制时计算闪烁透明度
    for (const s of this.stars) {
      s.update(dt);
      s.draw(this.ctx, intensity);
    }
  }

  // 清空所有粒子（resize / destroy 时）
  clear(): void {
    this.particles.length = 0;
    this.stars.length = 0;
    this.leafAccumulator = 0;
    this.snowAccumulator = 0;
  }
}
