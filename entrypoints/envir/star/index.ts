// ⭐ 星光相关：常量、生成与目标数量计算
// 夜间（19 点至次日 5 点）在屏幕上方 1/3 区域显示的黄白色闪烁星光。
// 星光为 TwinklingParticle 派生（静止 + 闪烁），绘制由 particle/renderer.ts 按 elements.json 处理。

import { TwinklingParticle } from '../particle/particle';

export const STAR_MAX_COUNT = 60; // 24点（午夜）时的最大星光数量
export const STAR_SIZE_RANGE = { min: 1, max: 3 }; // 星光尺寸范围（像素），比雪花小

// ⭐ 根据当前小时计算星光目标数量
// 显示时段：19 点 到 次日 5 点；24 点（0 点）最多，向两端线性递减至 0
export function getStarTargetCount(hour: number, maxCount: number): number {
  // 19-23 点：从 0 线性增加到 4/5
  if (hour >= 19 && hour <= 23) {
    return Math.round(maxCount * ((hour - 19) / 5));
  }
  // 0-5 点：0 点为最大值，5 点降为 0
  if (hour >= 0 && hour <= 5) {
    return Math.round(maxCount * ((5 - hour) / 5));
  }
  // 其他时段不显示
  return 0;
}

// ⭐ 创建一颗星光 — 位置在屏幕上方 1/3 区域
export function createStar(width: number, height: number): TwinklingParticle {
  return new TwinklingParticle({
    type: 'star',
    x: Math.random() * width,
    y: Math.random() * (height / 3), // 上方 1/3 区域
    size: STAR_SIZE_RANGE.min + Math.random() * (STAR_SIZE_RANGE.max - STAR_SIZE_RANGE.min),
    color: '#FFFAD6', // 与 elements.json 中 star 的颜色一致
    speedY: 0, // 静止
    rotation: 0,
    rotSpeed: 0,
    opacity: 1,
    wobblePhase: 0,
    wobbleSpeed: 0,
    wobbleAmp: 0,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.8 + Math.random() * 2.2, // 闪烁频率 0.8~3.0 rad/s
    baseOpacity: 0.5 + Math.random() * 0.5, // 基础透明度 0.5~1.0
  });
}

