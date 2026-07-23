// ⭐ 星光相关：常量、生成、目标数量计算、绘制与数量调整
// 夜间（19 点至次日 5 点）在屏幕上方 1/3 区域显示的黄白色闪烁星光。

export const STAR_MAX_COUNT = 60; // 24点（午夜）时的最大星光数量
export const STAR_SIZE_RANGE = { min: 1, max: 3 }; // 星光尺寸范围（像素），比雪花小

// ⭐ 星光 — 静止于屏幕上方，闪烁
export interface Star {
  x: number;
  y: number;
  size: number;
  twinklePhase: number; // 闪烁相位
  twinkleSpeed: number; // 闪烁频率
  baseOpacity: number; // 基础透明度
}

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
export function createStar(width: number, height: number): Star {
  return {
    x: Math.random() * width,
    y: Math.random() * (height / 3), // 上方 1/3 区域
    size: STAR_SIZE_RANGE.min + Math.random() * (STAR_SIZE_RANGE.max - STAR_SIZE_RANGE.min),
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.8 + Math.random() * 2.2, // 闪烁频率 0.8~3.0 rad/s
    baseOpacity: 0.5 + Math.random() * 0.5, // 基础透明度 0.5~1.0
  };
}

// ⭐ 调整星光数量至目标值（就地修改传入数组）
// 增加：在原有基础上添加新星光，不删除原有
// 减少：随机删除多余星光
export function updateStars(
  stars: Star[],
  currentHour: number,
  intensity: number,
  width: number,
  height: number,
): void {
  // 星光数量受显示程度影响
  const maxStars = Math.round(STAR_MAX_COUNT * Math.min(intensity, 1.5));
  const target = getStarTargetCount(currentHour, maxStars);

  if (stars.length < target) {
    // 增加新星光，保留原有
    while (stars.length < target) {
      stars.push(createStar(width, height));
    }
  } else if (stars.length > target) {
    // 随机删除多余星光
    while (stars.length > target) {
      const idx = Math.floor(Math.random() * stars.length);
      stars.splice(idx, 1);
    }
  }
}

// ⭐ 星光绘制 — 类似雪花但内部纯白，向外渐变，带闪烁效果
export function drawStar(
  ctx: CanvasRenderingContext2D,
  star: Star,
  intensity: number,
) {
  // 闪烁：透明度随正弦波变化
  const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(star.twinklePhase));
  const opacity = star.baseOpacity * twinkle * Math.min(intensity, 1.5);

  ctx.save();
  ctx.globalAlpha = Math.max(0, opacity);

  // 星光渐变：中心黄白 → 中间淡黄 → 边缘透明，由内到外慢慢变得朦胧
  const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size);
  gradient.addColorStop(0, 'rgba(255,250,220,1.0)');
  gradient.addColorStop(0.4, 'rgba(255,240,180,0.6)');
  gradient.addColorStop(1, 'rgba(255,235,150,0)');

  ctx.beginPath();
  ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}
