/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { registry } from '../../envir/particle';

/* 新建粒子视图（骨架）：类型选择、参数配置、导入与实时预览在下一阶段实现 */
export function renderNewElementView(): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'panel';

  const title = document.createElement('h2');
  title.className = 'panel-title';
  title.textContent = '新建粒子';
  panel.appendChild(title);

  const stat = document.createElement('p');
  stat.className = 'hint';
  stat.textContent = `已加载 ${registry.list().length} 个粒子元素（内置 + 本地）。`;
  panel.appendChild(stat);

  const todo = document.createElement('p');
  todo.className = 'hint placeholder';
  todo.textContent = '类型选择、参数配置、SVG 导入与实时预览将在下一阶段实现。';
  panel.appendChild(todo);

  return panel;
}
