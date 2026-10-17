/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 元素注册表：内置（elements.json）+ 用户库（lib/element-store）+ 内置覆盖 三层合并成一张表。
// 运行期以 registry.list()/get() 访问；用户库变更时自动重建并通知订阅者。
import { BUILTIN_ELEMENTS, clampDescriptor, type ElementDescriptor } from './elements';
import {
  USER_LIBRARY_KEY,
  loadUserLibrary,
  type ElementOverride,
  type UserElement,
} from '../../../lib/element-store';

interface UserLibraryShape {
  elements: UserElement[];
  overrides: Record<string, ElementOverride>;
}

class ElementRegistry {
  private map = new Map<string, ElementDescriptor>();
  private listeners = new Set<() => void>();
  private ready = false;
  private listening = false;

  get isReady(): boolean {
    return this.ready;
  }

  /* 初始化：加载内置 + 用户 + 覆盖，并监听用户库变更自动重建 */
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

  /* 用给定用户库重建注册表（内置 → 用户 → 覆盖） */
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

  /* 当前全部元素（内置在前，用户在后） */
  list(): ElementDescriptor[] {
    return [...this.map.values()];
  }

  /* 按 id 取元素 */
  get(id: string): ElementDescriptor | undefined {
    return this.map.get(id);
  }

  /* 订阅重建事件，返回取消函数 */
  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(): void {
    for (const cb of this.listeners) cb();
  }
}

export const registry = new ElementRegistry();
