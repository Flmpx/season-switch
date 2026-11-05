/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { pushPage } from '../nav';
import { cardRow, pageShell } from '../ui';
import { renderSeasonPage } from './season';
import { renderTimePage } from './time';
import { renderDisplayPage } from './display';
import { renderParticlePage } from './particle';
import { registry } from '../../envir/particle';
import type { Settings } from '../../../lib/settings';

/** 季节取值的显示文字 */
const SEASON_LABELS: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
  'custom-season': '自定义月份',
  'system-season': '跟随系统',
};

/** 时间取值的显示文字 */
const TIME_LABELS: Record<string, string> = {
  dawn: '清晨',
  morning: '上午',
  noon: '中午',
  afternoon: '下午',
  dusk: '傍晚',
  evening: '晚上',
  midnight: '深夜',
  'custom-time': '自定义时间',
  'system-time': '跟随系统',
};

/** 显示程度取值的显示文字 */
const INTENSITY_LABELS: Record<string, string> = {
  misty: '朦朦',
  light: '浅',
  medium: '中',
  deep: '深',
  'custom-intensity': '自定义',
};

/** 主页面的一项入口 */
interface MainItem {
  icon: string; // 圆形图标里的字符
  label: string; // 行标题
  desc: (settings: Settings) => string; // 行说明，展示当前取值
  open: (settings: Settings) => HTMLElement; // 点击后渲染的子页面
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

/** 主页四个入口 */
const ITEMS: MainItem[] = [
  { icon: 'leaf', label: '季节', desc: seasonDesc, open: renderSeasonPage },
  { icon: 'clock', label: '时间', desc: timeDesc, open: renderTimePage },
  { icon: 'sun', label: '显示程度', desc: intensityDesc, open: renderDisplayPage },
  { icon: 'sparkle', label: '粒子', desc: () => `${registry.list().length} 种粒子`, open: renderParticlePage },
];

/**
 * 渲染主页：四个设置入口，说明文字显示当前取值
 */
export function renderMainPage(settings: Settings): HTMLElement {
  const shell = pageShell('设置', false);

  for (const item of ITEMS) {
    const card = document.createElement('div');
    card.className = 'card';
    card.appendChild(
      cardRow({
        icon: item.icon,
        label: item.label,
        desc: item.desc(settings),
        right: 'chevron',
        onClick: () => pushPage(item.open(settings)),
      }),
    );
    shell.body.appendChild(card);
  }

  return shell.page;
}
