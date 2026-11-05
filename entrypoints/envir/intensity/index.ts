/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/** 显示程度相关：将设置映射为强度系数，影响色调、光晕、粒子与星光 */
import type { Settings } from '../../../lib/settings';

export const INTENSITY_MAP: Record<string, number> = { // 显示程度到强度系数的映射
  misty: 0.4, // 朦朦
  light: 0.7, // 浅
  medium: 1.0, // 中（默认）
  deep: 1.4, // 深
  'custom-intensity': 1.0, // 自定义（实际值由 customIntensity 决定）
};

/** 将显示程度设置转换为强度系数 */
export function getIntensityValue(settings: Settings): number {
  if (settings.intensity === 'custom-intensity') {
    return settings.customIntensity / 100;
  }
  return INTENSITY_MAP[settings.intensity] ?? 1.0;
}
