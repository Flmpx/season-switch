// 亮度（时段光线）相关：根据设置计算页面整体亮度并应用到遮罩层
import type { Settings } from '../../../lib/settings';

// 时段 → 小时映射（0-23）
export const TIME_OF_DAY_HOURS: Record<string, number> = {
  dawn: 6, // 清晨
  morning: 10, // 上午
  noon: 12, // 中午（最亮）
  afternoon: 15, // 下午
  dusk: 18, // 傍晚
  evening: 21, // 晚上
  midnight: 0, // 深夜（0 点）
};

// 可调节的最低亮度系数：深夜亮度降到该值（0~1，建议 ≥0.5 以免影响阅读）
export const MIN_BRIGHTNESS = 0.7;

// 时段预设亮度系数（1.0 = 不降低亮度）
export const TIME_OF_DAY_BRIGHTNESS: Record<string, number> = {
  dawn: 0.85, // 清晨
  morning: 0.95, // 上午
  noon: 1.0, // 中午（最亮）
  afternoon: 0.95, // 下午
  dusk: 0.8, // 傍晚
  evening: 0.7, // 晚上
  midnight: MIN_BRIGHTNESS, // 深夜（最暗）
};

/* 根据时间设置计算页面亮度系数（自定义/跟随系统按小时余弦插值） */
export function getTimeBrightness(settings: Settings): number {
  if (settings.timeOfDay in TIME_OF_DAY_BRIGHTNESS) {
    return TIME_OF_DAY_BRIGHTNESS[settings.timeOfDay];
  }
  let hour: number;
  if (settings.timeOfDay === 'custom-time') {
    hour = settings.customHour;
  } else {
    hour = new Date().getHours();
  }
  const normalized = (hour - 12) / 12;
  const cos = Math.cos(normalized * Math.PI);
  return MIN_BRIGHTNESS + ((cos + 1) / 2) * (1.0 - MIN_BRIGHTNESS);
}

/* 将亮度系数应用到亮度遮罩层（亮度越低遮罩越不透明） */
export function updateBrightnessOverlay(div: HTMLElement, timeBrightness: number): void {
  const darkness = 1.0 - timeBrightness;
  div.style.backgroundColor = `rgba(0, 0, 0, ${darkness})`;
}
