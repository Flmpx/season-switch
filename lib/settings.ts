/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/** 单个轴的取值：档位或自定义数值 */
export type AxisChoice =
  | { kind: 'preset'; index: number } // 选了第几档
  | { kind: 'custom'; value: number }; // 自定义数值

/** 单个元素的当前值，三个轴各自二选一 */
export interface ParticleValue {
  speed: AxisChoice; // px/s（twinkle 不使用）
  size: AxisChoice; // px
  count: AxisChoice; // fall 为个/分钟，twinkle 为午夜峰值颗数
}

/** 全局设置 */
export interface Settings {
  schemaVersion: number; // 数据格式版本，与当前版本不符时整体重置
  season: string; // 季节：内置季节或自定义/跟随系统
  customMonth: number; // 1-12，自定义季节时使用
  timeOfDay: string; // 时段：内置时段或自定义/跟随系统
  customHour: number; // 0-24，自定义时间时使用，允许半小时
  intensity: string; // 显示程度：内置档位或自定义
  customIntensity: number; // 自定义显示程度 0-200，100 等于档位「中」
  particles: Record<string, ParticleValue>; // 每个元素的当前值，键为元素 id
}

export const SCHEMA_VERSION = 2; // 当前数据格式版本

export const DEFAULT_SETTINGS: Settings = { // 全局默认设置
  schemaVersion: SCHEMA_VERSION, // 当前版本
  season: 'system-season', // 跟随系统时间选季节
  customMonth: new Date().getMonth() + 1, // 默认当月
  timeOfDay: 'system-time', // 跟随系统时间
  customHour: new Date().getHours(), // 默认当前小时
  intensity: 'medium', // 默认中等
  customIntensity: 100, // 自定义档位默认等于「中」
  particles: {}, // 空表示全部用档位中间值
};

/** 判断一个值是不是合法的轴选择 */
function isChoice(value: unknown): value is AxisChoice {
  if (!value || typeof value !== 'object') return false;
  const choice = value as { kind?: unknown; index?: unknown; value?: unknown };
  if (choice.kind === 'custom') {
    return typeof choice.value === 'number' && Number.isFinite(choice.value);
  }
  if (choice.kind === 'preset') {
    return typeof choice.index === 'number' && Number.isInteger(choice.index) && choice.index >= 0;
  }
  return false;
}

/** 只保留合法的新版粒子配置，旧格式直接丢弃 */
function sanitizeParticles(raw: unknown): Record<string, ParticleValue> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, ParticleValue> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const item = value as { speed?: unknown; size?: unknown; count?: unknown };
    if (isChoice(item.speed) && isChoice(item.size) && isChoice(item.count)) {
      out[key] = { speed: item.speed, size: item.size, count: item.count };
    }
  }
  return out;
}

/** 把可能越界的数值夹到范围内，非法值回退默认 */
function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** 读取设置，缺失或非法字段回退默认值 */
export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get('settings');
  const stored = (data.settings ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    customMonth: clampNumber(stored.customMonth, 1, 12, DEFAULT_SETTINGS.customMonth),
    customHour: clampNumber(stored.customHour, 0, 24, DEFAULT_SETTINGS.customHour),
    customIntensity: clampNumber(stored.customIntensity, 0, 200, DEFAULT_SETTINGS.customIntensity),
    particles: sanitizeParticles(stored.particles),
  };
}

/** 将设置写入存储 */
export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

/** 订阅设置变更，返回取消订阅函数 */
export function onSettingsChanged(
  callback: (settings: Settings) => void,
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName === 'local' && changes.settings && changes.settings.newValue != null) {
      callback(changes.settings.newValue as Settings);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
