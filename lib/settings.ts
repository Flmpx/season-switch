/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/* 单个元素的当前值 */
export interface ParticleValue {
  speed: number; // px/s（twinkle 恒为 0）
  size: number; // px
  count: number; // fall 为个/分钟，twinkle 为午夜峰值颗数
}

/* 全局设置 */
export interface Settings {
  season: string; // 季节：spring/summer/autumn/winter/custom-season/system-season
  customMonth: number; // 1-12，自定义季节时使用
  timeOfDay: string; // 时间：dawn/morning/noon/afternoon/dusk/evening/midnight/custom-time/system-time
  customHour: number; // 0-23，自定义时间时使用
  intensity: string; // 显示程度：misty/light/medium/deep/custom-intensity
  customIntensity: number; // 自定义显示程度 0-100
  particles: Record<string, ParticleValue>; // 每个元素的当前值，键为元素 id
}

/* 全局默认设置 */
export const DEFAULT_SETTINGS: Settings = {
  season: 'system-season', // 跟随系统时间选季节
  customMonth: new Date().getMonth() + 1, // 默认当月
  timeOfDay: 'system-time', // 跟随系统时间
  customHour: new Date().getHours(), // 默认当前小时
  intensity: 'medium', // 默认中等
  customIntensity: 50, // 自定义档位默认值
  particles: {}, // 空表示全部用描述符 defaults
};

/* 只保留数值型粒子配置，丢弃旧格式与非法值 */
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

/* 读取设置，缺失字段回退默认值，粒子配置逐项净化 */
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
