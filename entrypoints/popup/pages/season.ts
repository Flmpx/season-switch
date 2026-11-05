/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { popPage, refreshHeight } from '../nav';
import { cardRow, pageShell, setRowActive, sliderCard, type SliderCard } from '../ui';
import { saveSettings, type Settings } from '../../../lib/settings';

/** 季节选项：[取值, 显示文字, 图标] */
const SEASON_OPTS: [string, string, string][] = [
  ['spring', '春', 'sprout'],
  ['summer', '夏', 'sun'],
  ['autumn', '秋', 'leaf'],
  ['winter', '冬', 'snow'],
  ['custom-season', '自定义月份', 'calendar'],
  ['system-season', '跟随系统', 'monitor'],
];

/**
 * 渲染季节设置页：选项卡片列表，选中自定义月份时展开滑块
 */
export function renderSeasonPage(settings: Settings): HTMLElement {
  const shell = pageShell('季节', true, () => popPage());
  const rows = new Map<string, HTMLButtonElement>();
  let slider: SliderCard | null = null;

  /** 把选中状态与滑块显隐同步到界面 */
  function sync(): void {
    for (const [value, row] of rows) setRowActive(row, value === settings.season);
    if (slider) slider.root.style.display = settings.season === 'custom-season' ? 'flex' : 'none';
    refreshHeight();
  }

  for (const [value, label, icon] of SEASON_OPTS) {
    const card = document.createElement('div');
    card.className = 'card';
    const row = cardRow({
      icon,
      label,
      right: 'none',
      onClick: () => {
        settings.season = value;
        void saveSettings(settings);
        sync();
      },
    });
    rows.set(value, row);
    card.appendChild(row);
    shell.body.appendChild(card);

    if (value === 'custom-season') {
      slider = sliderCard({
        min: 1,
        max: 12,
        step: 1,
        value: settings.customMonth,
        format: (v) => `${v} 月`,
        onInput: (v) => {
          settings.customMonth = v;
          void saveSettings(settings);
        },
      });
      shell.body.appendChild(slider.root);
    }
  }

  sync();
  return shell.page;
}
