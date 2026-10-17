/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 新建粒子页：编辑一份草稿，点「保存」才写入用户库（避免误操作产生半成品）。
import type { UserElement } from '../../../lib/element-store';
import { addElement, validateElement } from '../../../lib/element-store';
import { button, h } from '../fields';
import { createElementForm, defaultElement } from '../form';
import { createPreview } from '../preview';
import { toast } from '../toast';

/* 渲染新建页 */
export function renderNewElementView(): HTMLElement {
  const draft = defaultElement();
  const root = h('div', 'view new');

  const topbar = h('div', 'topbar');
  const title = h('h2', 'topbar-title', '新建粒子');
  const actions = h('div', 'topbar-actions');

  const errorBar = h('div', 'error-bar');
  errorBar.hidden = true;

  const preview = createPreview();
  const previewCol = h('div', 'preview-column');
  previewCol.appendChild(preview.root);

  function showError(message: string | null): void {
    if (!message) {
      errorBar.hidden = true;
      errorBar.textContent = '';
      return;
    }
    errorBar.hidden = false;
    errorBar.textContent = message;
  }

  async function save(): Promise<void> {
    const state: UserElement = form.read();
    const check = validateElement(state);
    if (!check.ok) {
      showError(check.errors[0]);
      return;
    }
    showError(null);
    const { id: _ignored, ...input } = state;
    const created = await addElement(input);
    toast('已创建');
    location.hash = `#/detail/${created.id}`;
  }

  const saveBtn = button('保存', 'primary', () => {
    void save();
  });
  actions.appendChild(saveBtn);

  topbar.append(title, actions);

  const form = createElementForm(draft, {
    onChange: (next) => {
      title.textContent = next.label ? `新建粒子 · ${next.label}` : '新建粒子';
      preview.update({ ...next, source: 'user' }, next.color ?? '#ffffff');
    },
  });

  preview.update({ ...draft, source: 'user' }, draft.color ?? '#ffffff');

  const formCol = h('div', 'form-column');
  formCol.append(errorBar, form.root);

  const grid = h('div', 'detail-grid');
  grid.append(formCol, previewCol);
  root.append(topbar, grid);
  return root;
}
