// ❄️ 雪花相关：尺寸范围、生成与绘制
// 冬季节点的球状雪花（内白外朦胧）。

import type { FallingParticle } from '../particle';

// 雪花尺寸范围（像素）— 中等大小基准
export const SNOW_SIZE_RANGE = { min: 3, max: 10 };

export function createSnow(
  width: number,
  height: number,
  particleSizeScale: number,
): FallingParticle {
  // 应用粒子大小缩放系数到雪花 min/max 边界
  const sizeMin = SNOW_SIZE_RANGE.min * particleSizeScale;
  const sizeMax = SNOW_SIZE_RANGE.max * particleSizeScale;
  return {
    x: Math.random() * width,
    y: -20 - Math.random() * height,
    size: sizeMin + Math.random() * (sizeMax - sizeMin), // ❄️ 雪花尺寸范围（应用缩放）
    speedY: 10 + Math.random() * 20, // 下落速度（像素/秒），比叶子慢
    rotation: 0,
    rotSpeed: 0, // 雪花不旋转
    opacity: 0.4 + Math.random() * 0.5, // 初始透明度 0.4~0.9
    type: 'snow',
    color: 'white',
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.4 + Math.random() * 0.8, // 摇摆频率，比叶子慢
    wobbleAmp: 10 + Math.random() * 20, // 摇摆幅度，比叶子小
  };
}

// ❄️ 雪花绘制 — 球状径向渐变：内白 → 朦胧边
export function drawSnow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, opacity);

  // 雪花渐变：中心白 0.9 → 中间 0.5 → 边缘透明
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}
