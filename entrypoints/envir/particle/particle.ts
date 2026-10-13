// 🧬 粒子基类与派生类
// 通用粒子属性与基本控制方法收归粒子自身：
//   - Particle（抽象基类）：通用字段 + update（下落/摆动/着陆渐隐）+ draw（按元素描述符渲染）
//   - FallingParticle（fall 派生）：下落 + 摆动 + 渐隐，speedY/wobble 由创建参数决定
//   - TwinklingParticle（twinkle 派生）：静止不动，仅更新闪烁相位，由 draw 计算闪烁透明度
// 渲染统一走 particle/renderer.ts 的 drawParticle（按 elements.json 描述符）。

import { drawParticle } from './renderer';

// 粒子构造入参：所有通用字段
export interface ParticleInit {
  type: string;
  x: number;
  y: number;
  size: number;
  color: string;
  speedY: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleAmp: number;
}

// 🧬 粒子抽象基类：通用属性 + 基本控制方法
export abstract class Particle {
  type: string;
  x: number;
  y: number;
  size: number;
  color: string;
  speedY: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleAmp: number;

  constructor(init: ParticleInit) {
    this.type = init.type;
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
  }

  // 基类默认行为：摆动 + 下落 + 着陆渐隐
  // 不动的粒子（如星光）由派生类 override，将 speedY/wobble 置 0 即可
  update(dt: number, height: number): void {
    this.wobblePhase += this.wobbleSpeed * dt;
    this.x += Math.sin(this.wobblePhase) * this.wobbleAmp * dt;
    this.y += this.speedY * dt;
    this.rotation += this.rotSpeed * dt;

    // 着陆：到达窗口底部后停下，缓慢渐隐消失
    const groundY = height - this.size;
    if (this.y >= groundY) {
      this.y = groundY;
      this.speedY = 0;
      this.rotSpeed = 0;
      this.opacity -= dt * 0.5; // 渐隐速度（值越大消失越快，0.5 ≈ 2 秒消失）
    }
  }

  // 基类默认绘制：按元素类型从 JSON 描述符渲染
  draw(ctx: CanvasRenderingContext2D, intensity: number): void {
    drawParticle(ctx, {
      type: this.type,
      x: this.x,
      y: this.y,
      size: this.size,
      rotation: this.rotation,
      opacity: this.opacity * Math.min(intensity, 1.5),
      color: this.color,
    });
  }
}

// 🍃❄️ 飘落派生类（leaf / snow 共用）：下落 + 摆动 + 渐隐
export class FallingParticle extends Particle {
  constructor(init: ParticleInit) {
    super(init);
  }
}

// ⭐ 闪烁派生类（star）：静止不动，仅闪烁
export class TwinklingParticle extends Particle {
  twinklePhase: number;
  twinkleSpeed: number;
  baseOpacity: number;

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

  // override：不动（speedY/wobble 已为 0），仅推进闪烁相位
  override update(dt: number): void {
    this.twinklePhase += this.twinkleSpeed * dt;
  }

  // override：透明度随正弦波闪烁
  override draw(ctx: CanvasRenderingContext2D, intensity: number): void {
    const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.twinklePhase));
    const opacity = this.baseOpacity * twinkle * Math.min(intensity, 1.5);
    drawParticle(ctx, {
      type: this.type,
      x: this.x,
      y: this.y,
      size: this.size,
      rotation: 0,
      opacity,
      color: this.color,
    });
  }
}
