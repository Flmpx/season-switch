// 🌓 亮度（时段光线）相关
// 根据设置的时间计算页面整体亮度系数，并将其应用到亮度遮罩层。

import type { Settings } from '../../../lib/settings';

// 时段 → 小时映射（0-23）— 用于计算页面亮度
// 中午=12点（最亮），深夜=0点（最暗）
export const TIME_OF_DAY_HOURS: Record<string, number> = {
  dawn: 6, // 清晨
  morning: 10, // 上午
  noon: 12, // 中午（最亮，不降低亮度）
  afternoon: 15, // 下午
  dusk: 18, // 傍晚
  evening: 21, // 晚上
  midnight: 0, // 深夜（最暗，0点）
};

// 可调节的最低亮度系数 — 深夜时页面亮度降低到该值（0~1）
// 调大 → 深夜更亮；调小 → 深夜更暗（但不应低于 0.5，以免影响网页阅读）
export const MIN_BRIGHTNESS = 0.7;

// 时段预设的亮度系数（1.0 = 不降低亮度）
export const TIME_OF_DAY_BRIGHTNESS: Record<string, number> = {
  dawn: 0.85, // 清晨
  morning: 0.95, // 上午
  noon: 1.0, // 中午（最亮）
  afternoon: 0.95, // 下午
  dusk: 0.8, // 傍晚
  evening: 0.7, // 晚上
  midnight: MIN_BRIGHTNESS, // 深夜（最暗）
};

// 根据时间设置计算页面亮度系数（1.0 = 不降低亮度）
// 自定义时间 / 跟随系统：根据小时（0-23），在中午(12点,亮度1.0)和深夜(0点,亮度MIN_BRIGHTNESS)之间插值
export function getTimeBrightness(settings: Settings): number {
  // 预设时段直接返回对应亮度
  if (settings.timeOfDay in TIME_OF_DAY_BRIGHTNESS) {
    return TIME_OF_DAY_BRIGHTNESS[settings.timeOfDay];
  }

  // 自定义时间或跟随系统：取小时值（0-23）
  let hour: number;
  if (settings.timeOfDay === 'custom-time') {
    hour = settings.customHour;
  } else {
    // system-time
    hour = new Date().getHours();
  }

  // 将 0~23 小时映射到亮度系数
  // 12 点为最亮 (1.0)，0 点为最暗 (MIN_BRIGHTNESS)
  // 使用余弦曲线平滑过渡：cos((hour-12)/12 * π) → 12点=1.0, 0点=-1.0
  const normalized = (hour - 12) / 12; // -1 ~ 1
  const cos = Math.cos(normalized * Math.PI); // 12点=1, 0点=-1
  // 映射到 [MIN_BRIGHTNESS, 1.0]
  return MIN_BRIGHTNESS + ((cos + 1) / 2) * (1.0 - MIN_BRIGHTNESS);
}

// 将亮度系数应用到亮度遮罩层：亮度越低，黑色遮罩越不透明
export function updateBrightnessOverlay(div: HTMLElement, timeBrightness: number): void {
  const darkness = 1.0 - timeBrightness; // 0~(1-MIN_BRIGHTNESS)
  div.style.backgroundColor = `rgba(0, 0, 0, ${darkness})`;
}
