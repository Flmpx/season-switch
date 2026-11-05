/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { popPage, refreshHeight } from '../nav';
import { cardRow, pageShell, setRowActive, sliderCard, type SliderCard } from '../ui';
import { saveSettings, type Settings } from '../../../lib/settings';

const TIME_OPTS: [string, string, string][] = [ // 时间选项：[取值, 显示文字, 图标]
  ['dawn', '清晨', 'sunrise'],
  ['morning', '上午', 'sun'],
  ['noon', '中午', 'sun'],
  ['afternoon', '下午', 'cloudsun'],
  ['dusk', '傍晚', 'sunset'],
  ['evening', '晚上', 'moon'],
  ['midnight', '深夜', 'star'],
  ['custom-time', '自定义时间', 'clock'],
  ['system-time', '跟随系统', 'monitor'],
];

/** 小时数格式化成「7.5 点」 */
function formatHour(value: number): string {
  return `${Number(value.toFixed(1))} 点`;
}

/**
 * 渲染时间设置页：选项卡片列表，选中自定义时间时展开半小时步长的滑块
 * 选中状态与滑块显隐随时保持同步
 */
export function renderTimePage(settings: Settings): HTMLElement {
  const shell = pageShell('时间', true, () => popPage());
  const rows = new Map<string, HTMLButtonElement>();
  let slider: SliderCard | null = null;

  function sync(): void {
    for (const [value, row] of rows) setRowActive(row, value === settings.timeOfDay);
    if (slider) slider.root.style.display = settings.timeOfDay === 'custom-time' ? 'flex' : 'none';
    refreshHeight();
  }

  for (const [value, label, icon] of TIME_OPTS) {
    const card = document.createElement('div');
    card.className = 'card';
    const row = cardRow({
      icon,
      label,
      right: 'none',
      onClick: () => {
        settings.timeOfDay = value;
        void saveSettings(settings);
        sync();
      },
    });
    rows.set(value, row);
    card.appendChild(row);
    shell.body.appendChild(card);

    if (value === 'custom-time') {
      slider = sliderCard({
        min: 0,
        max: 24,
        step: 0.5,
        value: settings.customHour,
        format: formatHour,
        onInput: (v) => {
          settings.customHour = v;
          void saveSettings(settings);
        },
      });
      shell.body.appendChild(slider.root);
    }
  }

  sync();
  return shell.page;
}
