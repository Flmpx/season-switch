/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { registry } from '../../envir/particle';

/* 我的粒子视图（骨架）：本地元素列表、导入导出与详情页在下一阶段实现 */
export function renderMineView(): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'panel';

  const title = document.createElement('h2');
  title.className = 'panel-title';
  title.textContent = '我的粒子';
  panel.appendChild(title);

  const local = registry.list().filter((desc) => desc.source === 'user');
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent =
    local.length === 0 ? '还没有自定义粒子。' : `共 ${local.length} 个自定义粒子。`;
  panel.appendChild(hint);

  const todo = document.createElement('p');
  todo.className = 'hint placeholder';
  todo.textContent = '列表、导入导出与详情页将在下一阶段实现。';
  panel.appendChild(todo);

  return panel;
}
