// 🍃 叶子相关：颜色色板、尺寸范围、生成与绘制
// 春/夏/秋三季的飘落叶子。冬为雪花，见 ../snow。

import type { SeasonWeights } from '../../../lib/season-weights';
import type { FallingParticle } from '../particle';

// 叶子颜色 — 每个季节的色板，增删颜色直接影响叶子多样性
export const LEAF_COLORS = {
  spring: ['#8FBC8F', '#90EE90', '#7CCD7C', '#98FB98', '#66CD66'], // 春：嫩绿色系
  summer: ['#2E8B57', '#3CB371', '#228B22'], // 夏：深绿色系
  autumn: ['#DAA520', '#FFD700', '#FF8C00', '#D2691E', '#8B4513'], // 秋：金黄/枯黄色系（含枯黄 #D2691E #8B4513）
};

// 各季节叶子尺寸范围（像素）— 中等大小基准
// 粒子大小设置通过缩放系数同时改变 min 和 max
export const LEAF_SIZE_RANGES: Record<string, { min: number; max: number }> = {
  spring: { min: 4, max: 8 }, // 春叶
  summer: { min: 5, max: 9 }, // 夏叶
  autumn: { min: 5, max: 10 }, // 秋叶
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 根据季节权重随机选择叶子属于哪个季节的色板与尺寸范围
function chooseLeafSpec(weights: SeasonWeights): {
  colors: string[];
  sizeRange: { min: number; max: number };
} {
  const { spring, summer, autumn } = weights;
  const rand = Math.random() * (spring + summer + autumn);
  if (rand < spring) {
    return { colors: LEAF_COLORS.spring, sizeRange: LEAF_SIZE_RANGES.spring };
  }
  if (rand < spring + summer) {
    return { colors: LEAF_COLORS.summer, sizeRange: LEAF_SIZE_RANGES.summer };
  }
  return { colors: LEAF_COLORS.autumn, sizeRange: LEAF_SIZE_RANGES.autumn };
}

export function createLeaf(
  width: number,
  height: number,
  particleSizeScale: number,
  weights: SeasonWeights,
): FallingParticle {
  const { colors, sizeRange } = chooseLeafSpec(weights);
  // 应用粒子大小缩放系数到 min/max 边界
  const sizeMin = sizeRange.min * particleSizeScale;
  const sizeMax = sizeRange.max * particleSizeScale;
  return {
    x: Math.random() * width,
    y: -20 - Math.random() * height, // 初始位置：屏幕上方随机高度
    size: sizeMin + Math.random() * (sizeMax - sizeMin),
    speedY: 15 + Math.random() * 25, // 下落速度（像素/秒）
    rotation: Math.random() * Math.PI * 2, // 初始旋转角度
    rotSpeed: (Math.random() - 0.5) * 1.5, // 旋转速度（弧度/秒）
    opacity: 0.5 + Math.random() * 0.5, // 初始透明度 0.5~1.0
    type: 'leaf',
    color: pick(colors), // 从对应季节色板中随机取色
    wobblePhase: Math.random() * Math.PI * 2, // 摇摆初始相位
    wobbleSpeed: 0.8 + Math.random() * 1.2, // 摇摆频率
    wobbleAmp: 15 + Math.random() * 25, // 摇摆幅度（像素）
  };
}

// 🍃 叶子绘制 — 贝塞尔曲线叶形 + 中线叶脉
export function drawLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  angle: number,
  opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, opacity);
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Leaf body
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.bezierCurveTo(size * 0.6, -size * 0.3, size * 0.6, size * 0.3, 0, size);
  ctx.bezierCurveTo(-size * 0.6, size * 0.3, -size * 0.6, -size * 0.3, 0, -size);
  ctx.fillStyle = color;
  ctx.fill();

  // 叶脉中线
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.7);
  ctx.lineTo(0, size * 0.7);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; // 叶脉颜色：淡黑
  ctx.lineWidth = 0.5; // 叶脉粗细
  ctx.stroke();

  ctx.restore();
}
