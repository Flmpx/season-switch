/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 我的粒子列表：内置元素 + 自定义元素各自成组，支持进入详情、删除、导入导出 JSON。
import { registry } from '../../envir/particle';
import type { ElementDescriptor } from '../../envir/particle/elements';
import {
  exportLibrary,
  importLibrary,
  loadUserLibrary,
  removeElement,
  saveUserLibrary,
} from '../../../lib/element-store';
import { button, h } from '../fields';
import { renderKindLabel } from '../form';
import { requestRefresh } from '../refresh';
import { toast } from '../toast';

/* 重建注册表：存储事件是异步的，这里显式重建以便刷新后立刻看到结果 */
async function rebuild(): Promise<void> {
  registry.rebuild(await loadUserLibrary());
}

/* 导出自定义元素库为 JSON 文件 */
function downloadLibrary(): void {
  void (async () => {
    const lib = await loadUserLibrary();
    const blob = new Blob([exportLibrary(lib)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'season-switch-elements.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('已导出');
  })();
}

/* 导入 JSON：同 id 覆盖，未出现的旧元素保留 */
function importLibraryFile(file: File): void {
  void (async () => {
    const result = importLibrary(await file.text());
    if (!result.ok || !result.lib) {
      toast(result.errors[0] ?? '导入失败', 'error');
      return;
    }
    const current = await loadUserLibrary();
    const merged = new Map(current.elements.map((el) => [el.id, el] as const));
    for (const el of result.lib.elements) merged.set(el.id, el);
    current.elements = [...merged.values()];
    current.overrides = { ...current.overrides, ...result.lib.overrides };
    await saveUserLibrary(current);
    await rebuild();
    toast(`已导入 ${result.lib.elements.length} 个元素`);
    requestRefresh();
  })();
}

/* 单个元素行 */
function elementRow(desc: ElementDescriptor): HTMLElement {
  const row = h('div', 'row');

  const icon = h('span', 'row-icon', desc.icon || '·');

  const main = h('div', 'row-main');
  main.append(
    h('div', 'row-name', desc.label),
    h('div', 'row-sub', `${desc.behavior === 'fall' ? '飘落' : '闪烁'} · ${renderKindLabel(desc.render.kind)}`),
  );

  const actions = h('div', 'row-actions');
  actions.appendChild(h('span', `badge ${desc.source}`, desc.source === 'builtin' ? '内置' : '自定义'));
  actions.appendChild(
    button('编辑', 'ghost', () => {
      location.hash = `#/detail/${desc.id}`;
    }),
  );

  if (desc.source === 'user') {
    let confirmed = false;
    const del = button('删除', 'ghost', () => {
      if (!confirmed) {
        confirmed = true;
        del.textContent = '确认删除';
        del.classList.add('armed');
        window.setTimeout(() => {
          confirmed = false;
          del.textContent = '删除';
          del.classList.remove('armed');
        }, 2500);
        return;
      }
      void (async () => {
        await removeElement(desc.id);
        await rebuild();
        toast('已删除');
        requestRefresh();
      })();
    });
    actions.appendChild(del);
  }

  row.append(icon, main, actions);
  return row;
}

/* 分组标题 + 行列表 */
function section(title: string, rows: HTMLElement[], emptyText?: string): HTMLElement {
  const wrap = h('section', 'list-section');
  wrap.appendChild(h('div', 'list-head', title));
  if (rows.length === 0) {
    const empty = h('div', 'empty');
    empty.append(h('span', '', emptyText ?? '还没有元素'));
    empty.appendChild(
      button('新建一个', 'ghost', () => {
        location.hash = '#/new';
      }),
    );
    wrap.appendChild(empty);
  } else {
    const list = h('div', 'list');
    list.append(...rows);
    wrap.appendChild(list);
  }
  return wrap;
}

/* 渲染列表页 */
export function renderMineView(): HTMLElement {
  const root = h('div', 'view mine');

  const topbar = h('div', 'topbar');
  const title = h('h2', 'topbar-title', '我的粒子');
  const actions = h('div', 'topbar-actions');

  const filePicker = h('input', 'file hidden-file');
  filePicker.type = 'file';
  filePicker.accept = '.json,application/json';
  filePicker.addEventListener('change', () => {
    const picked = filePicker.files?.[0];
    if (picked) importLibraryFile(picked);
    filePicker.value = '';
  });

  actions.append(
    button('导入 JSON', 'ghost', () => filePicker.click()),
    button('导出 JSON', 'ghost', downloadLibrary),
    button('新建粒子', 'primary', () => {
      location.hash = '#/new';
    }),
    filePicker,
  );
  topbar.append(title, actions);

  const all = registry.list();
  const builtins = all.filter((e) => e.source === 'builtin').map(elementRow);
  const users = all.filter((e) => e.source === 'user').map(elementRow);

  root.append(
    topbar,
    section('内置粒子', builtins, '内置元素缺失'),
    section('自定义粒子', users, '还没有自定义粒子'),
  );
  return root;
}
