/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 元素详情页：编辑一个元素的全部可调参数，改动即时落盘。
// 内置元素编辑写入 overrides（不修改 entities.json），外观只读；用户元素直接更新用户库。
import { registry } from '../../envir/particle';
import { BUILTIN_ELEMENTS, type ElementDescriptor } from '../../envir/particle/elements';
import {
  clearOverride,
  loadUserLibrary,
  removeElement,
  setOverride,
  updateElement,
  validateElement,
  type ElementOverride,
  type UserElement,
} from '../../../lib/element-store';
import { button, h } from '../fields';
import { createElementForm } from '../form';
import { createPreview } from '../preview';
import { requestRefresh } from '../refresh';
import { toast } from '../toast';

/* 需要和内置基线比较、从而生成覆盖的字段（外观除外） */
const COMPARE_KEYS = [
  'label',
  'icon',
  'behavior',
  'seasons',
  'color',
  'speedPresets',
  'sizePresets',
  'countPresets',
  'motion',
  'target',
  'defaults',
] as const;

/* 计算内置元素相对其基线的覆盖内容 */
function buildOverride(id: string, state: UserElement): ElementOverride | null {
  const base = BUILTIN_ELEMENTS[id] as unknown as Record<string, unknown> | undefined;
  if (!base) return null;
  const patch: Record<string, unknown> = {};
  let changed = false;
  for (const key of COMPARE_KEYS) {
    const next = (state as unknown as Record<string, unknown>)[key];
    if (JSON.stringify(base[key]) !== JSON.stringify(next)) {
      patch[key] = next;
      changed = true;
    }
  }
  return changed ? (patch as ElementOverride) : null;
}

/* 渲染详情页；元素不存在时返回 null 由路由回退 */
export function renderDetailView(id: string): HTMLElement | null {
  const desc = registry.get(id);
  if (!desc) return null;

  const isBuiltin = desc.source === 'builtin';
  const { source, ...initial } = desc;
  let state: UserElement = initial;

  const root = h('div', 'view detail');
  const topbar = h('div', 'topbar');
  const back = button('返回', 'ghost', () => {
    location.hash = '#/mine';
  });
  const title = h('h2', 'topbar-title', desc.label);

  const actions = h('div', 'topbar-actions');
  let confirmDelete = false;

  if (isBuiltin) {
    const restore = button('恢复默认', 'ghost', () => {
      void (async () => {
        await clearOverride(id);
        registry.rebuild(await loadUserLibrary());
        toast('已恢复默认');
        requestRefresh();
      })();
    });
    actions.appendChild(restore);
  } else {
    const del = button('删除', 'danger', () => {
      if (!confirmDelete) {
        confirmDelete = true;
        del.textContent = '确认删除';
        del.classList.add('armed');
        window.setTimeout(() => {
          confirmDelete = false;
          del.textContent = '删除';
          del.classList.remove('armed');
        }, 2500);
        return;
      }
      void (async () => {
        await removeElement(id);
        registry.rebuild(await loadUserLibrary());
        toast('已删除');
        location.hash = '#/mine';
      })();
    });
    actions.appendChild(del);
  }

  topbar.append(back, title, actions);

  const errorBar = h('div', 'error-bar');
  errorBar.hidden = true;

  const preview = createPreview();
  const previewCol = h('div', 'preview-column');
  previewCol.appendChild(preview.root);

  /* 输入 300ms 后落盘：避免每个滑块拖动都写一次存储 */
  let timer = 0;
  let pending = false;

  function showError(message: string | null): void {
    if (!message) {
      errorBar.hidden = true;
      errorBar.textContent = '';
      return;
    }
    errorBar.hidden = false;
    errorBar.textContent = message;
  }

  async function persist(next: UserElement): Promise<void> {
    if (!pending) return;
    const check = validateElement(next);
    if (!check.ok) {
      showError(check.errors[0]);
      return;
    }
    showError(null);
    pending = false;
    if (isBuiltin) {
      const patch = buildOverride(id, next);
      if (patch) await setOverride(id, patch);
      else await clearOverride(id);
    } else {
      const { id: _ignored, ...input } = next;
      await updateElement(id, input);
    }
    toast('已保存');
  }

  const form = createElementForm(state, {
    lockedRender: isBuiltin,
    onChange: (next) => {
      state = next;
      title.textContent = next.label || '未命名';
      preview.update({ ...next, source: desc.source }, next.color ?? '#ffffff');
      pending = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void persist(next);
      }, 300);
    },
  });

  preview.update(desc, state.color ?? '#ffffff');

  const formCol = h('div', 'form-column');
  formCol.append(errorBar, form.root);

  const grid = h('div', 'detail-grid');
  grid.append(formCol, previewCol);
  root.append(topbar, grid);
  return root;
}

/* 元素描述符的显示名（列表与标题复用） */
export function describeElement(desc: ElementDescriptor): string {
  const behavior = desc.behavior === 'fall' ? '飘落' : '闪烁';
  return `${behavior} · ${desc.render.kind}`;
}
