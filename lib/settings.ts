/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */
export interface Settings {
  season: string; // 'spring' | 'summer' | 'autumn' | 'winter' | 'custom-season' | 'system-season'
  customMonth: number; // 1-12
  timeOfDay: string; // 'dawn' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'evening' | 'midnight' | 'custom-time' | 'system-time'
  customHour: number; // 0-23，自定义时间使用
  intensity: string; // 'misty' | 'light' | 'medium' | 'deep' | 'custom-intensity'
  customIntensity: number; // 0-100
  particleCount: string; // 'minimal' | 'few' | 'medium' | 'heavy' | 'custom-particle'
  customParticleCount: number; // particles per second
  particleSize: string; // 'small' | 'medium' | 'large' | 'custom-size'
  customParticleSize: number; // 0-100
}

export const DEFAULT_SETTINGS: Settings = {
  season: 'system-season',
  customMonth: new Date().getMonth() + 1,
  timeOfDay: 'system-time',
  customHour: new Date().getHours(),
  intensity: 'medium',
  customIntensity: 50,
  particleCount: 'medium',
  customParticleCount: 50,
  particleSize: 'medium',
  customParticleSize: 50,
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
