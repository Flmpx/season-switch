/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { pushPage } from '../nav';
import { cardRow, pageShell } from '../ui';
import { openManager } from '../open-manager';
import { renderSeasonPage } from './season';
import { renderTimePage } from './time';
import { renderDisplayPage } from './display';
import { renderParticlePage } from './particle';
import { renderSettingsPage } from './settings';
import { registry } from '../../envir/particle';
import type { Settings } from '../../../lib/settings';

const SEASON_LABELS: Record<string, string> = { // 季节取值的显示文字
  spring: '春', // 春季
  summer: '夏', // 夏季
  autumn: '秋', // 秋季
  winter: '冬', // 冬季
  'custom-season': '自定义月份', // 手动选月份
  'system-season': '跟随系统', // 跟随系统季节
};

const TIME_LABELS: Record<string, string> = { // 时间取值的显示文字
  dawn: '清晨', // 天将亮时
  morning: '上午', // 上午
  noon: '中午', // 正午
  afternoon: '下午', // 下午
  dusk: '傍晚', // 日落前后
  evening: '晚上', // 入夜之后
  midnight: '深夜', // 午夜
  'custom-time': '自定义时间', // 手动设定小时
  'system-time': '跟随系统', // 跟随系统时间
};

const INTENSITY_LABELS: Record<string, string> = { // 显示程度取值的显示文字
  misty: '朦朦', // 最淡一档
  light: '浅', // 偏淡
  medium: '中', // 中等
  deep: '深', // 最浓一档
  'custom-intensity': '自定义', // 手动调百分比
};

/** 主页面的一项入口 */
interface MainItem {
  icon: string; // 圆形图标里的图形
  label: string; // 行标题
  desc: (settings: Settings) => string; // 行说明，展示当前取值
  activate: (settings: Settings) => void; // 点击后的动作
  split?: boolean; // 是否与上方效果类入口分组
}

/** 季节当前取值的说明文字 */
function seasonDesc(settings: Settings): string {
  if (settings.season === 'custom-season') return `${settings.customMonth} 月`;
  return SEASON_LABELS[settings.season] ?? settings.season;
}

/** 时间当前取值的说明文字 */
function timeDesc(settings: Settings): string {
  if (settings.timeOfDay === 'custom-time') return `${settings.customHour} 点`;
  return TIME_LABELS[settings.timeOfDay] ?? settings.timeOfDay;
}

/** 显示程度当前取值的说明文字 */
function intensityDesc(settings: Settings): string {
  if (settings.intensity === 'custom-intensity') return `${settings.customIntensity}%`;
  return INTENSITY_LABELS[settings.intensity] ?? settings.intensity;
}

const ITEMS: MainItem[] = [ // 主页入口：前四项改效果，后两项进管理页与全局设置
  {
    icon: 'leaf',
    label: '季节',
    desc: seasonDesc,
    activate: (settings) => pushPage(renderSeasonPage(settings)),
  },
  {
    icon: 'clock',
    label: '时间',
    desc: timeDesc,
    activate: (settings) => pushPage(renderTimePage(settings)),
  },
  {
    icon: 'sun',
    label: '显示程度',
    desc: intensityDesc,
    activate: (settings) => pushPage(renderDisplayPage(settings)),
  },
  {
    icon: 'sparkle',
    label: '粒子',
    desc: () => `${registry.list().length} 种粒子的参数`,
    activate: (settings) => pushPage(renderParticlePage(settings)),
  },
  {
    icon: 'list',
    label: '我的粒子',
    desc: () => '编辑、删除与导入导出',
    activate: () => {
      void openManager('mine');
    },
    split: true,
  },
  {
    icon: 'settings',
    label: '设置',
    desc: () => '光晕与亮度',
    activate: (settings) => pushPage(renderSettingsPage(settings)),
  },
];

/**
 * 渲染主页：六项入口，说明文字显示当前取值
 */
export function renderMainPage(settings: Settings): HTMLElement {
  const shell = pageShell('Season Switch', false);

  for (const item of ITEMS) {
    const card = document.createElement('div');
    card.className = item.split ? 'card split' : 'card';
    card.appendChild(
      cardRow({
        icon: item.icon,
        label: item.label,
        desc: item.desc(settings),
        right: 'chevron',
        onClick: () => item.activate(settings),
      }),
    );
    shell.body.appendChild(card);
  }

  return shell.page;
}
