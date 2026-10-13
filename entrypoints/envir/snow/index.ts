// ❄️ 雪花相关：尺寸范围、生成
// 冬季节点的球状雪花（内白外朦胧）。
// 绘制由 particle/renderer.ts 按 elements.json 统一处理。

import { FallingParticle } from '../particle/particle';

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
  return new FallingParticle({
    type: 'snow',
    x: Math.random() * width,
    y: -20 - Math.random() * height,
    size: sizeMin + Math.random() * (sizeMax - sizeMin), // ❄️ 雪花尺寸范围（应用缩放）
    speedY: 10 + Math.random() * 20, // 下落速度（像素/秒），比叶子慢
    rotation: 0,
    rotSpeed: 0, // 雪花不旋转
    opacity: 0.4 + Math.random() * 0.5, // 初始透明度 0.4~0.9
    color: 'white',
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.4 + Math.random() * 0.8, // 摇摆频率，比叶子慢
    wobbleAmp: 10 + Math.random() * 20, // 摇摆幅度，比叶子小
  });
}
