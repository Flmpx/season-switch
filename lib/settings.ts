/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */
// 每个氛围元素的独立粒子设置：速度/大小/数目三者互相独立，叶子、雪花、星光各自一套
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

/** 单个元素的粒子配置 */
export interface ElementConfig {
  speed: ParticleSpeedPreset; // 下落速度预设
  customSpeed: number; // 0-100，自定义速度使用
  size: ParticleSizePreset; // 粒子大小预设
  customSize: number; // 0-100，自定义大小使用
  count: ParticleCountPreset; // 数目预设
  customCount: number; // 叶子/雪花：10-1800（个/分钟）；星光：10-150（个，午夜峰值）
}

/** 元素的默认配置（新元素首次落入时使用） */
export const DEFAULT_ELEMENT_CONFIG: ElementConfig = {
  speed: 'normal', // 下落速度 = 基础速度 × 1.0
  customSpeed: 50,
  size: 'medium', // 尺寸缩放系数 = 1.0
  customSize: 50,
  count: 'medium',
  customCount: 50, // 实际值由 DEFAULT_SETTINGS 各元素覆盖
};

/** 全局设置 */
export interface Settings {
  season: string; // 季节：spring/summer/autumn/winter/custom-season/system-season
  customMonth: number; // 1-12，自定义季节使用
  timeOfDay: string; // 时间：dawn/morning/noon/afternoon/dusk/evening/midnight/custom-time/system-time
  customHour: number; // 0-23，自定义时间使用
  intensity: string; // 显示程度：misty/light/medium/deep/custom-intensity
  customIntensity: number; // 0-100
  // 粒子设置：键为元素类型（取自 elements.json），值为该元素的速度/大小/数目配置
  particles: Record<string, ElementConfig>;
}

/** 全局默认设置 */
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

/* 从存储读取设置，缺失字段回退默认值 */
export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

/* 将设置写入存储 */
export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

/* 订阅设置变更，返回取消订阅函数 */
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
