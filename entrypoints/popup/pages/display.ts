/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { popPage, refreshHeight } from '../nav';
import { cardRow, pageShell, setRowActive, sliderCard, type SliderCard } from '../ui';
import { saveSettings, type Settings } from '../../../lib/settings';

const INTENSITY_OPTS: [string, string, string][] = [ // 显示程度选项：[取值, 显示文字, 图标]
  ['misty', '朦朦', 'mist'],
  ['light', '浅', 'cloud'],
  ['medium', '中', 'cloudsun'],
  ['deep', '深', 'sun'],
  ['custom-intensity', '自定义', 'level'],
];

/**
 * 渲染显示程度设置页：选项卡片列表，选中自定义时展开百分比滑块
 * 选中状态与滑块显隐随时保持同步
 */
export function renderDisplayPage(settings: Settings): HTMLElement {
  const shell = pageShell('显示程度', true, () => popPage());
  const rows = new Map<string, HTMLButtonElement>();
  let slider: SliderCard | null = null;

  function sync(): void {
    for (const [value, row] of rows) setRowActive(row, value === settings.intensity);
    if (slider) {
      slider.root.style.display = settings.intensity === 'custom-intensity' ? 'flex' : 'none';
    }
    refreshHeight();
  }

  for (const [value, label, icon] of INTENSITY_OPTS) {
    const card = document.createElement('div');
    card.className = 'card';
    const row = cardRow({
      icon,
      label,
      right: 'none',
      onClick: () => {
        settings.intensity = value;
        void saveSettings(settings);
        sync();
      },
    });
    rows.set(value, row);
    card.appendChild(row);
    shell.body.appendChild(card);

    if (value === 'custom-intensity') {
      slider = sliderCard({
        min: 0,
        max: 200,
        step: 5,
        value: settings.customIntensity,
        format: (v) => `${v}%`,
        onInput: (v) => {
          settings.customIntensity = v;
          void saveSettings(settings);
        },
      });
      shell.body.appendChild(slider.root);
    }
  }

  sync();
  return shell.page;
}
