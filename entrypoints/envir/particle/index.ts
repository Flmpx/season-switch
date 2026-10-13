// 🍃❄️⭐ 粒子系统相关
// 按元素（leaf / snow / star）分别的设置映射（速度 / 大小 / 数目）。
// 粒子的生成与生命周期见 ./manager，绘制见 ./renderer.ts（读 elements.json）。
// 粒子类型与行为见 ./particle（Particle 基类 + FallingParticle / TwinklingParticle 派生）。

import type { ElementConfig } from '../../../lib/settings';

// ---- 速度（下落速度缩放系数） ----
// 星光为静止（speed=0），不参与速度计算，但保留统一字段以便 UI 一致。
export const SPEED_SCALE_MAP: Record<string, number> = {
  slow: 0.5, // 慢
  normal: 1.0, // 中（默认，等于原基础速度）
  fast: 1.8, // 快
  'custom-speed': 1.0, // 自定义（实际值由 customSpeed 字段决定）
};

// 速度缩放系数（normal = 1.0 = 原基础下落速度）
// 自定义 0-100%：0%→0.2, 50%→1.0（中）, 100%→2.0
// 分段线性插值，保证 50% 恰好为 1.0
export function getSpeedScale(cfg: ElementConfig): number {
  if (cfg.speed === 'custom-speed') {
    const v = cfg.customSpeed;
    if (v <= 50) {
      return 0.2 + (v / 50) * 0.8; // 0→0.2, 50→1.0
    }
    return 1.0 + ((v - 50) / 50) * 1.0; // 50→1.0, 100→2.0
  }
  return SPEED_SCALE_MAP[cfg.speed] ?? 1.0;
}

// ---- 大小（尺寸缩放系数） ----
export const SIZE_SCALE_MAP: Record<string, number> = {
  small: 0.6, // 小
  medium: 1.0, // 中（默认）
  large: 1.5, // 大
  'custom-size': 1.0, // 自定义（实际值由 customSize 字段决定）
};

// 粒子大小缩放系数（1.0 = 中等）
// 自定义 0-100%：0%→0.3, 50%→1.0（中等）, 100%→1.8
// 分段线性插值，保证 50% 恰好为 1.0
export function getSizeScale(cfg: ElementConfig): number {
  if (cfg.size === 'custom-size') {
    const v = cfg.customSize;
    if (v <= 50) {
      return 0.3 + (v / 50) * 0.7; // 0→0.3, 50→1.0
    }
    return 1.0 + ((v - 50) / 50) * 0.8; // 50→1.0, 100→1.8
  }
  return SIZE_SCALE_MAP[cfg.size] ?? 1.0;
}

// ---- 数目（叶子 / 雪花：个/分钟 生成速率） ----
export const COUNT_RATE_MAP: Record<string, number> = {
  minimal: 10, // 微量
  few: 20, // 少量
  medium: 50, // 中等（默认）
  heavy: 120, // 大量
  'custom-count': 50, // 自定义（实际值由 customCount 字段决定）
};

// 将元素的数目设置转换为 个/分钟 的生成速率
export function getCountPerMinute(cfg: ElementConfig): number {
  if (cfg.count === 'custom-count') {
    return cfg.customCount;
  }
  return COUNT_RATE_MAP[cfg.count] ?? 50;
}

// ---- 数目（星光：午夜最大数量，个） ----
// 星光按当前时段在 0 ~ 午夜最大数量 之间线性维持（见 manager.maintainStars）。
export const STAR_MAX_COUNT_MAP: Record<string, number> = {
  minimal: 15, // 微量
  few: 30, // 少量
  medium: 60, // 中等（默认）
  heavy: 120, // 大量
  'custom-count': 60, // 自定义（实际值由 customCount 字段决定）
};

// 星光午夜最大数量（个）
export function getStarMaxCount(cfg: ElementConfig): number {
  if (cfg.count === 'custom-count') {
    return cfg.customCount;
  }
  return STAR_MAX_COUNT_MAP[cfg.count] ?? 60;
}
