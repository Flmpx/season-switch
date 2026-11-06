/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { popPage } from '../nav';
import { pageShell, switchRow } from '../ui';
import { saveSettings, type Settings } from '../../../lib/settings';

/**
 * 渲染设置页：光晕与亮度两个开关
 * 改动即时写入存储，网页侧通过设置变更事件立刻生效
 */
export function renderSettingsPage(settings: Settings): HTMLElement {
  const shell = pageShell('设置', true, () => popPage());

  shell.body.appendChild(
    switchRow({
      icon: 'cloudsun',
      label: '光晕',
      desc: '夏天白天在右上角显示暖色光晕',
      checked: settings.halo,
      onChange: (checked) => {
        settings.halo = checked;
        void saveSettings(settings);
      },
    }).root,
  );

  shell.body.appendChild(
    switchRow({
      icon: 'clock',
      label: '亮度随时间变化',
      desc: '关闭后网页保持原样，不再随清晨夜晚变暗',
      checked: settings.timeBrightness,
      onChange: (checked) => {
        settings.timeBrightness = checked;
        void saveSettings(settings);
      },
    }).root,
  );

  return shell.page;
}
