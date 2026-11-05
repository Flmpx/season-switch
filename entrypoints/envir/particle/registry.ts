/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { BUILTIN_ELEMENTS, clampDescriptor, type ElementDescriptor } from './elements';
import {
  USER_LIBRARY_KEY,
  loadUserLibrary,
  type ElementOverride,
  type UserElement,
} from '../../../lib/element-store';

/** 存储里用户库的形状 */
interface UserLibraryShape {
  elements: UserElement[]; // 用户自建元素
  overrides: Record<string, ElementOverride>; // 内置元素覆盖
}

/** 元素注册表：把内置、用户、覆盖三层合并成一张表 */
class ElementRegistry {
  private map = new Map<string, ElementDescriptor>(); // 合并后的元素表
  private listeners = new Set<() => void>(); // 重建事件的订阅者
  private ready = false; // 是否已完成首次加载
  private listening = false; // 是否已挂上存储监听

  /** 是否已完成首次加载 */
  get isReady(): boolean {
    return this.ready;
  }

  /** 加载用户库并建立存储监听，之后用户库变更会自动重建 */
  async init(): Promise<void> {
    this.rebuild(await loadUserLibrary());
    this.ready = true;
    if (!this.listening) {
      this.listening = true;
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[USER_LIBRARY_KEY]) {
          const value = (changes[USER_LIBRARY_KEY].newValue ?? {
            elements: [],
            overrides: {},
          }) as UserLibraryShape;
          this.rebuild(value);
        }
      });
    }
  }

  /** 用给定用户库重建注册表，顺序为内置 → 用户 → 覆盖 */
  rebuild(lib: UserLibraryShape): void {
    const map = new Map<string, ElementDescriptor>();
    for (const [id, builtin] of Object.entries(BUILTIN_ELEMENTS)) {
      map.set(id, clampDescriptor({ ...builtin, id, source: 'builtin' }));
    }
    for (const el of lib.elements ?? []) {
      if (!el || typeof el.id !== 'string') continue;
      map.set(el.id, clampDescriptor({ ...el, source: 'user' }));
    }
    for (const [id, over] of Object.entries(lib.overrides ?? {})) {
      const base = map.get(id);
      if (base && base.source === 'builtin') {
        map.set(id, clampDescriptor({ ...base, ...over, id, source: 'builtin' }));
      }
    }
    this.map = map;
    this.emit();
  }

  /** 当前全部元素，内置在前用户在后 */
  list(): ElementDescriptor[] {
    return [...this.map.values()];
  }

  /** 按 id 取元素 */
  get(id: string): ElementDescriptor | undefined {
    return this.map.get(id);
  }

  /** 订阅重建事件，返回取消订阅函数 */
  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** 通知所有订阅者 */
  private emit(): void {
    for (const cb of this.listeners) cb();
  }
}

export const registry = new ElementRegistry(); // 全局唯一的注册表实例
