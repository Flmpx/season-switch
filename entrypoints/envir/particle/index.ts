/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 粒子系统：按元素分别的设置映射（速度/大小/数目）与配置聚合
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

// 下落速度缩放系数：星光静止不参与
export const SPEED_SCALE_MAP: Record<string, number> = {
  slow: 0.5, // 慢
  normal: 1.0, // 中（默认）
  fast: 1.8, // 快
  'custom-speed': 1.0, // 自定义（实际值由 customSpeed 决定）
};

/* 将元素的速度设置转换为下落速度缩放系数（0-100% 分段线性，50%→1.0） */
export function getSpeedScale(cfg: ElementConfig): number {
  if (cfg.speed === 'custom-speed') {
    const v = cfg.customSpeed;
    if (v <= 50) {
      return 0.2 + (v / 50) * 0.8;
    }
    return 1.0 + ((v - 50) / 50) * 1.0;
  }
  return SPEED_SCALE_MAP[cfg.speed] ?? 1.0;
}

// 尺寸缩放系数
export const SIZE_SCALE_MAP: Record<string, number> = {
  small: 0.6, // 小
  medium: 1.0, // 中（默认）
  large: 1.5, // 大
  'custom-size': 1.0, // 自定义（实际值由 customSize 决定）
};

/* 将元素的大小设置转换为尺寸缩放系数（0-100% 分段线性，50%→1.0） */
export function getSizeScale(cfg: ElementConfig): number {
  if (cfg.size === 'custom-size') {
    const v = cfg.customSize;
    if (v <= 50) {
      return 0.3 + (v / 50) * 0.7;
    }
    return 1.0 + ((v - 50) / 50) * 0.8;
  }
  return SIZE_SCALE_MAP[cfg.size] ?? 1.0;
}

// 叶子/雪花：个/分钟 生成速率
export const COUNT_RATE_MAP: Record<string, number> = {
  minimal: 10, // 微量
  few: 20, // 少量
  medium: 50, // 中等（默认）
  heavy: 120, // 大量
  'custom-count': 50, // 自定义（实际值由 customCount 决定）
};

/* 将元素的数目设置转换为 个/分钟 的生成速率 */
export function getCountPerMinute(cfg: ElementConfig): number {
  if (cfg.count === 'custom-count') {
    return cfg.customCount;
  }
  return COUNT_RATE_MAP[cfg.count] ?? 50;
}

// twinkle 元素：午夜（峰值）最大数量（个）
export const TWINKLE_MAX_COUNT_MAP: Record<string, number> = {
  minimal: 15, // 微量
  few: 30, // 少量
  medium: 60, // 中等（默认）
  heavy: 120, // 大量
  'custom-count': 60, // 自定义（实际值由 customCount 决定）
};

/* twinkle 元素峰值最大数量（个） */
export function getTwinkleMaxCount(cfg: ElementConfig): number {
  if (cfg.count === 'custom-count') {
    return cfg.customCount;
  }
  return TWINKLE_MAX_COUNT_MAP[cfg.count] ?? 60;
}

// 入夜/黎明时仍保留 25% 峰值数量的星光，避免"刚入夜瞬间一颗都没有"
const TWINKLE_FLOOR = 0.25;

/* twinkle 目标数量：依据描述符 target 与当前小时计算（跨午夜以午夜为峰值） */
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

/* 按元素聚合设置（供 content.ts / popup 使用，缺省回退默认） */
export function getElementConfigs(settings: Settings): Record<string, ElementConfig> {
  const out: Record<string, ElementConfig> = {};
  for (const type of ELEMENT_TYPES) {
    out[type] = settings.particles[type] ?? DEFAULT_ELEMENT_CONFIG;
  }
  return out;
}

// 元素描述符访问器（re-export，供 manager / popup 直接取自本模块）
export {
  ELEMENT_TYPES,
  getElementDescriptor,
  getElementMeta,
  seasonWeightFor,
} from './elements';
export type { ElementBehavior, ElementDescriptor, Range } from './elements';
