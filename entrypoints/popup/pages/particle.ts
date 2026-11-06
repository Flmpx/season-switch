/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { pushPage, popPage } from '../nav';
import { cardRow, pageShell } from '../ui';
import { openManager } from '../open-manager';
import { axisUnit, registry, resolveParticleValue } from '../../envir/particle';
import type { Settings } from '../../../lib/settings';
import { renderElementPage } from './element';
import { iconNode } from '../../../lib/icons';

/**
 * 渲染粒子列表页：每个元素一行，右上「+」在新标签页打开管理页
 */
export function renderParticlePage(settings: Settings): HTMLElement {
  const shell = pageShell('粒子', true, () => popPage());

  for (const desc of registry.list()) {
    const value = resolveParticleValue(desc, settings);
    const behavior = desc.behavior === 'fall' ? '飘落' : '闪烁';
    const card = document.createElement('div');
    card.className = 'card';
    card.appendChild(
      cardRow({
        icon: desc.icon,
        label: desc.label,
        desc: `${behavior} · ${value.size}px · 数量 ${value.count}${axisUnit('count', desc.behavior)}`,
        right: 'chevron',
        onClick: () => pushPage(renderElementPage(desc.id, settings)),
      }),
    );
    shell.body.appendChild(card);
  }

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'add';
  addButton.title = '新建粒子';
  addButton.appendChild(iconNode('plus', 16));
  addButton.addEventListener('click', () => {
    void openManager('new');
  });
  shell.header.appendChild(addButton);

  return shell.page;
}
