/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 用户元素库：用户自建粒子的增删改、覆盖内置元素、导入导出与校验。
// 本模块只读写存储，不反向依赖 registry（registry 通过 chrome.storage 事件自动重建）。
import type { ElementDescriptor, ElementRender } from '../entrypoints/envir/particle/elements';
import { loadSettings, saveSettings } from './settings';

export type UserElement = Omit<ElementDescriptor, 'source'>;
export type ElementOverride = Partial<Omit<ElementDescriptor, 'id' | 'source'>>;

export interface UserLibrary {
  version: 1;
  elements: UserElement[];
  overrides: Record<string, ElementOverride>;
}

export const USER_LIBRARY_KEY = 'userLibrary';

const EMPTY_LIB: UserLibrary = { version: 1, elements: [], overrides: {} };

/* 读取用户库（缺省回退空库） */
export async function loadUserLibrary(): Promise<UserLibrary> {
  const data = await chrome.storage.local.get(USER_LIBRARY_KEY);
  const raw = data[USER_LIBRARY_KEY];
  if (raw && typeof raw === 'object' && Array.isArray(raw.elements)) {
    return {
      version: 1,
      elements: raw.elements as UserElement[],
      overrides: (raw.overrides ?? {}) as Record<string, ElementOverride>,
    };
  }
  return { ...EMPTY_LIB, elements: [], overrides: {} };
}

/* 写入用户库 */
export async function saveUserLibrary(lib: UserLibrary): Promise<void> {
  await chrome.storage.local.set({ [USER_LIBRARY_KEY]: lib });
}

/* 生成用户元素 id（u_ 前缀） */
export function generateId(): string {
  return `u_${Math.random().toString(36).slice(2, 10)}`;
}

/* 校验结果 */
export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/* 校验一个元素定义（不含 id/source） */
export function validateElement(input: Partial<UserElement>): ValidationResult {
  const errors: string[] = [];
  if (!input.label || !input.label.trim()) errors.push('缺少名称');
  if (input.behavior !== 'fall' && input.behavior !== 'twinkle') errors.push('缺少行为类型');
  if (input.behavior === 'fall' && (!input.seasons || input.seasons.length === 0)) {
    errors.push('飘落元素需要至少一个出现季节');
  }
  if (input.behavior === 'twinkle' && !input.target) errors.push('闪烁元素需要出现时段');

  const r: ElementRender | undefined = input.render;
  if (!r) {
    errors.push('缺少外观');
  } else if (r.kind === 'svg' && (!r.paths || r.paths.length === 0)) {
    errors.push('SVG 外观缺少路径');
  } else if (r.kind === 'image' && !r.assetId) {
    errors.push('图片外观缺少资源');
  } else if (r.kind === 'emoji' && !r.glyph) {
    errors.push('emoji 外观缺少字形');
  } else if (r.kind === 'text' && !r.text) {
    errors.push('文字外观缺少内容');
  }

  if (!input.motion) errors.push('缺少运动参数');
  if (!input.sizePresets || input.sizePresets.length === 0) errors.push('缺少大小档位');
  if (!input.countPresets || input.countPresets.length === 0) errors.push('缺少数目档位');
  if (!input.defaults) errors.push('缺少默认值');
  return { ok: errors.length === 0, errors };
}

/* 新增用户元素（自动生成 id），返回完整描述符 */
export async function addElement(
  input: Omit<ElementDescriptor, 'id' | 'source'>,
): Promise<ElementDescriptor> {
  const id = generateId();
  const el: UserElement = { ...input, id };
  const lib = await loadUserLibrary();
  lib.elements.push(el);
  await saveUserLibrary(lib);
  return { ...el, source: 'user' };
}

/* 更新用户元素（按 id 整条替换） */
export async function updateElement(
  id: string,
  patch: Omit<ElementDescriptor, 'id' | 'source'>,
): Promise<void> {
  const lib = await loadUserLibrary();
  const i = lib.elements.findIndex((e) => e.id === id);
  if (i >= 0) lib.elements[i] = { ...patch, id };
  await saveUserLibrary(lib);
}

/* 删除用户元素（同时清掉 settings 里的当前值） */
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

/* 覆盖内置元素某字段 */
export async function setOverride(id: string, patch: ElementOverride): Promise<void> {
  const lib = await loadUserLibrary();
  lib.overrides[id] = patch;
  await saveUserLibrary(lib);
}

/* 清除内置元素覆盖 */
export async function clearOverride(id: string): Promise<void> {
  const lib = await loadUserLibrary();
  delete lib.overrides[id];
  await saveUserLibrary(lib);
}

/* 导出用户库为 JSON 文本 */
export function exportLibrary(lib: UserLibrary): string {
  return JSON.stringify(lib, null, 2);
}

/* 解析用户库 JSON 文本 */
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
        version: 1,
        elements: parsed.elements as UserElement[],
        overrides: (parsed.overrides ?? {}) as Record<string, ElementOverride>,
      },
    };
  } catch {
    return { ok: false, errors: ['JSON 解析失败'] };
  }
}
