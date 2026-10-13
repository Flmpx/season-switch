// 🧩 飘落粒子统一管理器
// 统一管理叶/雪等飘落粒子的生成、飘落（更新）、绘制与消失，
// 供 content.ts 协调者调用，使主循环的物理与生命周期逻辑内聚于此。
// 星光（TwinklingParticle）数量维持逻辑见 ./star，将在后续步骤并入本管理器。

import { Particle } from './particle';
import { createLeaf } from '../leaf';
import { createSnow } from '../snow';
import type { SeasonWeights } from '../../../lib/season-weights';

export class ParticleManager {
  private particles: Particle[] = []; // 飘落粒子（leaf / snow），统一以基类持有
  private accumulator = 0; // 生成累加器（秒）
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  // 当前粒子数量（调试/状态用）
  get count(): number {
    return this.particles.length;
  }

  // 按生成速率生成新粒子（leaf / snow 按季节权重分配）
  spawnStep(
    dt: number,
    rate: number,
    sizeScale: number,
    weights: SeasonWeights,
    width: number,
    height: number,
  ): void {
    this.accumulator += dt * rate;
    const leafWeight = weights.spring + weights.summer + weights.autumn;
    const snowWeight = weights.winter;
    while (this.accumulator >= 1) {
      this.accumulator -= 1;
      const rand = Math.random() * (leafWeight + snowWeight);
      if (rand < leafWeight) {
        this.particles.push(createLeaf(width, height, sizeScale, weights));
      } else {
        this.particles.push(createSnow(width, height, sizeScale));
      }
    }
  }

  // 每帧：更新（飘落/摆动/渐隐）+ 绘制 + 移除已消失粒子
  step(dt: number, height: number, intensity: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt, height);
      if (p.opacity <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.draw(this.ctx, intensity);
    }
  }

  // 清空所有粒子（resize / destroy 时）
  clear(): void {
    this.particles.length = 0;
    this.accumulator = 0;
  }
}
