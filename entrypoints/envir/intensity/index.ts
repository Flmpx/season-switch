/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 显示程度相关：将设置映射为强度系数，影响色调、光晕、粒子与星光
import type { Settings } from '../../../lib/settings';

// 显示程度 → 强度系数（数值越大氛围越浓）
export const INTENSITY_MAP: Record<string, number> = {
  misty: 0.4, // 朦朦
  light: 0.7, // 浅
  medium: 1.0, // 中（默认）
  deep: 1.4, // 深
  'custom-intensity': 1.0, // 自定义（实际值由 customIntensity 决定）
};

/* 将显示程度设置转换为强度系数（自定义 0-200 → 0-2，100 等于「中」） */
export function getIntensityValue(settings: Settings): number {
  if (settings.intensity === 'custom-intensity') {
    return settings.customIntensity / 100;
  }
  return INTENSITY_MAP[settings.intensity] ?? 1.0;
}
