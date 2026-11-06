/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { pushPage, popPage, refreshHeight, setPageRefresh } from '../nav';
import { cardRow, pageShell } from '../ui';
import { openManager } from '../open-manager';
import { axisUnit, registry, resolveParticleValue } from '../../envir/particle';
import type { Settings } from '../../../lib/settings';
import { renderElementPage } from './element';
import { iconNode } from '../../../lib/icons';

/**
 * 列出每个元素当前生效的数值，用于判断返回时是否需要重建
 */
function snapshotOf(settings: Settings): string {
  return JSON.stringify(
    registry.list().map((desc) => {
      const value = resolveParticleValue(desc, settings);
      return [desc.id, desc.label, desc.icon, value.size, value.count];
    }),
  );
}

/**
 * 渲染粒子列表页：每个元素一行，右上「+」在新标签页打开管理页
 * 返回本页时若元素数值已变，重建列表让说明文字跟上
 */
export function renderParticlePage(settings: Settings): HTMLElement {
  const shell = pageShell('粒子', true, () => popPage());
  let snapshot = snapshotOf(settings);

  function paint(): void {
    shell.body.replaceChildren(
      ...registry.list().map((desc) => {
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
        return card;
      }),
    );
  }

  function refresh(): void {
    const next = snapshotOf(settings);
    if (next === snapshot) return;
    snapshot = next;
    paint();
    refreshHeight();
  }

  paint();

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'add';
  addButton.title = '新建粒子';
  addButton.appendChild(iconNode('plus', 16));
  addButton.addEventListener('click', () => {
    void openManager('new');
  });
  shell.header.appendChild(addButton);

  setPageRefresh(shell.page, refresh);
  return shell.page;
}
