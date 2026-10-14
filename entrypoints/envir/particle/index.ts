// 🍃❄️⭐ 粒子系统相关
// 按元素（leaf / snow / star）分别的设置映射（速度 / 大小 / 数目）。
// 粒子的生成与生命周期见 ./manager，绘制见 ./renderer.ts（读 elements.json）。
// 粒子类型与行为见 ./particle（Particle 基类 + FallingParticle / TwinklingParticle 派生）。

import {
  DEFAULT_ELEMENT_CONFIG,
  type ElementConfig,
  type Settings,
} from '../../../lib/settings';
import {
  ELEMENT_TYPES,
  type ElementBehavior,
  type ElementDescriptor,
  type Range,
} from './elements';

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

// ---- 数目（twinkle 元素：午夜/峰值最大数量，个） ----
// twinkle 元素按当前时段在 0 ~ 峰值最大数量 之间线性维持（见 manager.maintainTwinkles）。
export const TWINKLE_MAX_COUNT_MAP: Record<string, number> = {
  minimal: 15, // 微量
  few: 30, // 少量
  medium: 60, // 中等（默认）
  heavy: 120, // 大量
  'custom-count': 60, // 自定义（实际值由 customCount 字段决定）
};

// twinkle 元素峰值最大数量（个）
export function getTwinkleMaxCount(cfg: ElementConfig): number {
  if (cfg.count === 'custom-count') {
    return cfg.customCount;
  }
  return TWINKLE_MAX_COUNT_MAP[cfg.count] ?? 60;
}

// 通用 twinkle 目标数量：依据描述符 target（visibleFrom/visibleTo）与当前小时计算
// 夜间窗口跨午夜（如 19→5）时以 0 点（午夜）为峰值；窗口不跨午夜时以窗口中点为峰值
// 为避免"刚入夜（19:00）瞬间一颗都没有"导致看起来像星光消失，窗口两端保留 TWINKLE_FLOOR 比例的基础星量
const TWINKLE_FLOOR = 0.25; // 入夜/黎明时仍保留 25% 峰值数量的星光
export function getTwinkleTarget(
  desc: ElementDescriptor,
  hour: number,
  maxCount: number,
): number {
  const from = desc.target?.visibleFrom ?? 0;
  const to = desc.target?.visibleTo ?? 0;
  const active = from <= to ? hour >= from && hour <= to : hour >= from || hour <= to;
  if (!active || maxCount <= 0) return 0;
  const half = from <= to ? (to - from) / 2 : Math.min(24 - from, to);
  const dist = from <= to ? Math.abs(hour - (from + to) / 2) : Math.min(hour, 24 - hour);
  return Math.round(maxCount * Math.max(TWINKLE_FLOOR, 1 - dist / half));
}

// ---- 按元素聚合设置（供 content.ts / popup 统一使用） ----
// 遍历当前 elements.json 的全部元素类型，缺省回退到默认配置
export function getElementConfigs(settings: Settings): Record<string, ElementConfig> {
  const out: Record<string, ElementConfig> = {};
  for (const type of ELEMENT_TYPES) {
    out[type] = settings.particles[type] ?? DEFAULT_ELEMENT_CONFIG;
  }
  return out;
}

// ---- 元素描述符访问器（re-export，供 manager / popup 直接取自本模块） ----
export {
  ELEMENT_TYPES,
  getElementDescriptor,
  getElementMeta,
  seasonWeightFor,
} from './elements';
export type { ElementBehavior, ElementDescriptor, Range } from './elements';
