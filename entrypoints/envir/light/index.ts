/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/** 亮度（时段光线）相关：根据设置计算页面整体亮度并应用到遮罩层 */
import type { Settings } from '../../../lib/settings';

export const TIME_OF_DAY_HOURS: Record<string, number> = { // 时段到小时的映射
  dawn: 6, // 清晨
  morning: 10, // 上午
  noon: 12, // 中午（最亮）
  afternoon: 15, // 下午
  dusk: 18, // 傍晚
  evening: 21, // 晚上
  midnight: 0, // 深夜（0 点）
};

export const MIN_BRIGHTNESS = 0.7; // 深夜亮度下限，建议不低于 0.5

export const TIME_OF_DAY_BRIGHTNESS: Record<string, number> = { // 各时段预设亮度
  dawn: 0.85, // 清晨
  morning: 0.95, // 上午
  noon: 1.0, // 中午（最亮）
  afternoon: 0.95, // 下午
  dusk: 0.8, // 傍晚
  evening: 0.7, // 晚上
  midnight: MIN_BRIGHTNESS, // 深夜（最暗）
};

/** 根据时间设置计算页面亮度系数 */
export function getTimeBrightness(settings: Settings, hour?: number): number {
  if (settings.timeOfDay in TIME_OF_DAY_BRIGHTNESS) {
    return TIME_OF_DAY_BRIGHTNESS[settings.timeOfDay];
  }
  let at: number;
  if (hour != null) {
    at = hour;
  } else if (settings.timeOfDay === 'custom-time') {
    at = settings.customHour;
  } else {
    const now = new Date();
    at = now.getHours() + now.getMinutes() / 60;
  }
  const normalized = (at - 12) / 12;
  const cos = Math.cos(normalized * Math.PI);
  return MIN_BRIGHTNESS + ((cos + 1) / 2) * (1.0 - MIN_BRIGHTNESS);
}

/** 将亮度系数应用到亮度遮罩层 */
export function updateBrightnessOverlay(div: HTMLElement, timeBrightness: number): void {
  const darkness = 1.0 - timeBrightness;
  div.style.backgroundColor = `rgba(0, 0, 0, ${darkness})`;
}
