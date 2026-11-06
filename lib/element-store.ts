/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import type { AxisPresets, ElementDescriptor, ElementRender } from '../entrypoints/envir/particle/elements';
import { middlePresetIndex } from '../entrypoints/envir/particle/elements';
import { loadSettings, saveSettings, SCHEMA_VERSION, type AxisChoice } from './settings';

/** 用户自建元素（无 source 字段） */
export type UserElement = Omit<ElementDescriptor, 'source'>;
/** 对内置元素的字段覆盖 */
export type ElementOverride = Partial<Omit<ElementDescriptor, 'id' | 'source'>>;

/** 用户元素库 */
export interface UserLibrary {
  version: number; // 数据版本，与当前版本不符时整体重建
  elements: UserElement[]; // 用户自建元素
  overrides: Record<string, ElementOverride>; // 内置元素的覆盖，键为内置 id
}

export const USER_LIBRARY_KEY = 'userLibrary'; // 用户库的存储键

/** 某一轴取中间档作为初始值 */
function midChoice(presets: number[]): AxisChoice {
  return { kind: 'preset', index: middlePresetIndex(presets.length) };
}

/** 读取用户库，缺失或版本不符时回退空库 */
export async function loadUserLibrary(): Promise<UserLibrary> {
  const data = await chrome.storage.local.get(USER_LIBRARY_KEY);
  const raw = data[USER_LIBRARY_KEY];
  if (
    raw &&
    typeof raw === 'object' &&
    raw.version === SCHEMA_VERSION &&
    Array.isArray(raw.elements)
  ) {
    return {
      version: SCHEMA_VERSION,
      elements: raw.elements as UserElement[],
      overrides: (raw.overrides ?? {}) as Record<string, ElementOverride>,
    };
  }
  return { version: SCHEMA_VERSION, elements: [], overrides: {} };
}

/** 写入用户库 */
export async function saveUserLibrary(lib: UserLibrary): Promise<void> {
  await chrome.storage.local.set({ [USER_LIBRARY_KEY]: lib });
}

/** 生成用户元素 id */
export function generateId(): string {
  return `u_${Math.random().toString(36).slice(2, 10)}`;
}

/** 校验结果 */
export interface ValidationResult {
  ok: boolean; // 是否通过
  errors: string[]; // 未通过的原因
}

/** 校验一个元素定义，返回缺失项 */
export function validateElement(input: Partial<UserElement>): ValidationResult {
  const errors: string[] = [];
  if (!input.label || !input.label.trim()) errors.push('缺少名称');
  if (input.behavior !== 'fall' && input.behavior !== 'twinkle') errors.push('缺少行为类型');

  const render: ElementRender | undefined = input.render;
  if (!render) {
    errors.push('缺少外观');
  } else if (render.kind === 'svg' && (!render.paths || render.paths.length === 0)) {
    errors.push('SVG 外观缺少路径');
  } else if (render.kind === 'image' && !render.assetId) {
    errors.push('图片外观缺少资源');
  } else if (render.kind === 'emoji' && !render.glyph) {
    errors.push('emoji 外观缺少字形');
  } else if (render.kind === 'text' && !render.text) {
    errors.push('文字外观缺少内容');
  }

  if (!input.motion) errors.push('缺少运动参数');
  if (!input.region) errors.push('缺少出现区域');
  if (!input.visible) errors.push('缺少出现时段');
  if (!input.presets || !input.presets.size || input.presets.size.length === 0) {
    errors.push('缺少大小档位');
  }
  if (!input.presets || !input.presets.count || input.presets.count.length === 0) {
    errors.push('缺少数目档位');
  }
  return { ok: errors.length === 0, errors };
}

/** 新元素的初始档位写进设置，每轴取中间档 */
async function seedParticleValue(id: string, presets: AxisPresets): Promise<void> {
  const settings = await loadSettings();
  settings.particles[id] = {
    speed: midChoice(presets.speed),
    size: midChoice(presets.size),
    count: midChoice(presets.count),
  };
  await saveSettings(settings);
}

/** 新增用户元素并返回完整描述符，id 自动生成 */
export async function addElement(
  input: Omit<ElementDescriptor, 'id' | 'source'>,
): Promise<ElementDescriptor> {
  const id = generateId();
  const el: UserElement = { ...input, id };
  const lib = await loadUserLibrary();
  lib.elements.push(el);
  await saveUserLibrary(lib);
  await seedParticleValue(id, el.presets);
  return { ...el, source: 'user' };
}

/** 按 id 整条替换用户元素 */
export async function updateElement(
  id: string,
  patch: Omit<ElementDescriptor, 'id' | 'source'>,
): Promise<void> {
  const lib = await loadUserLibrary();
  const i = lib.elements.findIndex((e) => e.id === id);
  if (i >= 0) lib.elements[i] = { ...patch, id };
  await saveUserLibrary(lib);
}

/** 删除用户元素，同时清掉它的覆盖与当前值 */
export async function removeElement(id: string): Promise<void> {
  const lib = await loadUserLibrary();
  lib.elements = lib.elements.filter((e) => e.id !== id);
  delete lib.overrides[id];
  await saveUserLibrary(lib);

  const settings = await loadSettings();
  if (settings.particles[id]) {
    delete settings.particles[id];
    await saveSettings(settings);
  }
}

/** 覆盖内置元素的字段 */
export async function setOverride(id: string, patch: ElementOverride): Promise<void> {
  const lib = await loadUserLibrary();
  lib.overrides[id] = patch;
  await saveUserLibrary(lib);
}

/** 清除内置元素的覆盖 */
export async function clearOverride(id: string): Promise<void> {
  const lib = await loadUserLibrary();
  delete lib.overrides[id];
  await saveUserLibrary(lib);
}

/** 把用户库导出成 JSON 文本 */
export function exportLibrary(lib: UserLibrary): string {
  return JSON.stringify(lib, null, 2);
}

/** 解析用户库 JSON 文本，失败时返回错误说明 */
export function importLibrary(text: string): { ok: boolean; errors: string[]; lib?: UserLibrary } {
  try {
    const parsed = JSON.parse(text) as Partial<UserLibrary>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.elements)) {
      return { ok: false, errors: ['不是有效的用户库 JSON'] };
    }
    return {
      ok: true,
      errors: [],
      lib: {
        version: SCHEMA_VERSION,
        elements: parsed.elements as UserElement[],
        overrides: (parsed.overrides ?? {}) as Record<string, ElementOverride>,
      },
    };
  } catch {
    return { ok: false, errors: ['JSON 解析失败'] };
  }
}
