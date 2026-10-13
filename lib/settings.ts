/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */
// 🍃❄️⭐ 每个氛围元素的独立粒子设置
// 速度 / 大小 / 数目 三者互相独立，叶子、雪花、星光各自一套。
// - speed：下落速度缩放（星光为静止，speed 不参与）
// - size：粒子尺寸缩放
// - count：数目（叶子/雪花 = 个/分钟生成速率；星光 = 午夜最大数量，个）

export type ParticleSpeedPreset =
  | 'slow'
  | 'normal'
  | 'fast'
  | 'custom-speed';
export type ParticleSizePreset =
  | 'small'
  | 'medium'
  | 'large'
  | 'custom-size';
export type ParticleCountPreset =
  | 'minimal'
  | 'few'
  | 'medium'
  | 'heavy'
  | 'custom-count';

export interface ElementConfig {
  speed: ParticleSpeedPreset; // 下落速度预设
  customSpeed: number; // 0-100，自定义速度使用
  size: ParticleSizePreset; // 粒子大小预设
  customSize: number; // 0-100，自定义大小使用
  count: ParticleCountPreset; // 数目预设
  customCount: number; // 叶子/雪花：10-1800（个/分钟）；星光：10-150（个，午夜最大）
}

export const DEFAULT_ELEMENT_CONFIG: ElementConfig = {
  speed: 'normal', // 下落速度 = 基础速度 × 1.0
  customSpeed: 50,
  size: 'medium', // 尺寸缩放系数 = 1.0
  customSize: 50,
  count: 'medium',
  customCount: 50, // 默认值会被各元素的 DEFAULT_SETTINGS 覆盖
};

export interface Settings {
  season: string; // 'spring' | 'summer' | 'autumn' | 'winter' | 'custom-season' | 'system-season'
  customMonth: number; // 1-12
  timeOfDay: string; // 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'evening' | 'midnight' | 'custom-time' | 'system-time'
  customHour: number; // 0-23，自定义时间使用
  intensity: string; // 'misty' | 'light' | 'medium' | 'deep' | 'custom-intensity'
  customIntensity: number; // 0-100
  // 🍃❄️⭐ 粒子设置：按元素分别配置（叶子 / 雪花 / 星光）
  particles: {
    leaf: ElementConfig;
    snow: ElementConfig;
    star: ElementConfig;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  season: 'system-season',
  customMonth: new Date().getMonth() + 1,
  timeOfDay: 'system-time',
  customHour: new Date().getHours(),
  intensity: 'medium',
  customIntensity: 50,
  particles: {
    leaf: {
      speed: 'normal',
      customSpeed: 50,
      size: 'medium',
      customSize: 50,
      count: 'medium', // 50 个/分钟
      customCount: 50,
    },
    snow: {
      speed: 'normal',
      customSpeed: 50,
      size: 'medium',
      customSize: 50,
      count: 'medium', // 50 个/分钟
      customCount: 50,
    },
    star: {
      speed: 'normal', // 星光静止，speed 不参与计算
      customSpeed: 50,
      size: 'medium',
      customSize: 50,
      count: 'medium', // 午夜最大 60 颗
      customCount: 60,
    },
  },
};

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

export function onSettingsChanged(
  callback: (settings: Settings) => void,
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName === 'local' && changes.settings) {
      callback(changes.settings.newValue);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
