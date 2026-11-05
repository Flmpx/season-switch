/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { drawParticle } from './renderer';
import type { ElementRender } from './elements';

/** 粒子构造入参 */
export interface ParticleInit {
  type: string; // 元素 id
  render: ElementRender; // 外观描述符
  x: number; // 横坐标（像素）
  y: number; // 纵坐标（像素）
  size: number; // 尺寸（像素）
  color: string; // 颜色，取自描述符或季节色板
  speedY: number; // 下落速度（像素/秒）
  rotation: number; // 旋转角（弧度）
  rotSpeed: number; // 旋转速度（弧度/秒）
  opacity: number; // 不透明度 0-1
  wobblePhase: number; // 摆动相位
  wobbleSpeed: number; // 摆动频率
  wobbleAmp: number; // 摆幅（像素）
  bottom: number; // 下落终点（像素），取元素区域下边界
}

/** 飘落粒子：通用属性与更新/绘制 */
export class Particle {
  type: string; // 元素 id
  render: ElementRender; // 外观描述符
  x: number; // 横坐标
  y: number; // 纵坐标
  size: number; // 尺寸
  color: string; // 颜色
  speedY: number; // 下落速度
  rotation: number; // 旋转角
  rotSpeed: number; // 旋转速度
  opacity: number; // 不透明度
  wobblePhase: number; // 摆动相位
  wobbleSpeed: number; // 摆动频率
  wobbleAmp: number; // 摆幅
  bottom: number; // 下落终点

  /** 用入参初始化所有字段 */
  constructor(init: ParticleInit) {
    this.type = init.type;
    this.render = init.render;
    this.x = init.x;
    this.y = init.y;
    this.size = init.size;
    this.color = init.color;
    this.speedY = init.speedY;
    this.rotation = init.rotation;
    this.rotSpeed = init.rotSpeed;
    this.opacity = init.opacity;
    this.wobblePhase = init.wobblePhase;
    this.wobbleSpeed = init.wobbleSpeed;
    this.wobbleAmp = init.wobbleAmp;
    this.bottom = init.bottom;
  }

  /** 摆动下落，触底后停住并渐隐 */
  update(dt: number): void {
    this.wobblePhase += this.wobbleSpeed * dt;
    this.x += Math.sin(this.wobblePhase) * this.wobbleAmp * dt;
    this.y += this.speedY * dt;
    this.rotation += this.rotSpeed * dt;
    const groundY = this.bottom - this.size;
    if (this.y >= groundY) {
      this.y = groundY;
      this.speedY = 0;
      this.rotSpeed = 0;
      this.opacity -= dt * 0.5;
    }
  }

  /** 按自身外观描述符绘制 */
  draw(ctx: CanvasRenderingContext2D, intensity: number): void {
    drawParticle(ctx, this.render, {
      x: this.x,
      y: this.y,
      size: this.size,
      rotation: this.rotation,
      opacity: this.opacity * Math.min(intensity, 1.5),
      color: this.color,
    });
  }
}

/** 闪烁粒子：静止不动，仅闪烁 */
export class TwinklingParticle extends Particle {
  twinklePhase: number; // 闪烁相位
  twinkleSpeed: number; // 闪烁频率
  baseOpacity: number; // 基础不透明度

  /** 用入参构造闪烁粒子 */
  constructor(
    init: ParticleInit & {
      twinklePhase: number;
      twinkleSpeed: number;
      baseOpacity: number;
    },
  ) {
    super(init);
    this.twinklePhase = init.twinklePhase;
    this.twinkleSpeed = init.twinkleSpeed;
    this.baseOpacity = init.baseOpacity;
  }

  /** 不动，只推进闪烁相位 */
  override update(dt: number): void {
    this.twinklePhase += this.twinkleSpeed * dt;
  }

  /** 透明度按正弦波闪烁后绘制 */
  override draw(ctx: CanvasRenderingContext2D, intensity: number): void {
    const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.twinklePhase));
    const opacity = this.baseOpacity * twinkle * Math.min(intensity, 1.5);
    drawParticle(ctx, this.render, {
      x: this.x,
      y: this.y,
      size: this.size,
      rotation: 0,
      opacity,
      color: this.color,
    });
  }
}
