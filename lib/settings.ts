/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 全局设置：季节/时间/显示程度 + 每个元素的三个数值（速度/大小/数目）。
// 数值缺省时由注册表里的描述符 defaults 回退（见 envir/particle/config.ts）。

/** 单个元素的当前值 */
export interface ParticleValue {
  speed: number; // px/s（twinkle 恒 0）
  size: number; // px
  count: number; // fall：个/分钟；twinkle：午夜峰值颗数
}

/** 全局设置 */
export interface Settings {
  season: string; // 季节：spring/summer/autumn/winter/custom-season/system-season
  customMonth: number; // 1-12，自定义季节使用
  timeOfDay: string; // 时间：dawn/morning/noon/afternoon/dusk/evening/midnight/custom-time/system-time
  customHour: number; // 0-23，自定义时间使用
  intensity: string; // 显示程度：misty/light/medium/deep/custom-intensity
  customIntensity: number; // 0-100
  particles: Record<string, ParticleValue>; // 键为元素 id
}

/** 全局默认设置 */
export const DEFAULT_SETTINGS: Settings = {
  season: 'system-season',
  customMonth: new Date().getMonth() + 1,
  timeOfDay: 'system-time',
  customHour: new Date().getHours(),
  intensity: 'medium',
  customIntensity: 50,
  particles: {},
};

/* 丢弃旧格式（字符串档位）等非法粒子值，只保留数值 */
function sanitizeParticles(raw: unknown): Record<string, ParticleValue> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, ParticleValue> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const p = v as { speed?: unknown; size?: unknown; count?: unknown };
    if (
      typeof p.speed === 'number' && Number.isFinite(p.speed) &&
      typeof p.size === 'number' && Number.isFinite(p.size) &&
      typeof p.count === 'number' && Number.isFinite(p.count)
    ) {
      out[k] = { speed: p.speed, size: p.size, count: p.count };
    }
  }
  return out;
}

/* 从存储读取设置，缺失字段回退默认值（particles 逐项净化） */
export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get('settings');
  const stored = (data.settings ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    particles: sanitizeParticles(stored.particles),
  };
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
      callback(changes.settings.newValue as Settings);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
