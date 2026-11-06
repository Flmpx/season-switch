/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/**
 * 弹窗通用控件：页壳、卡片行、滑块卡片
 * 三个控件在多个页面重复使用，统一放在这里保证视觉一致
 */
import { iconNode } from '../../lib/icons';

/** 页壳：页面容器、页头与正文 */
export interface PageShell {
  page: HTMLElement; // 整页容器
  header: HTMLElement; // 页头，可往里追加右侧按钮
  body: HTMLElement; // 唯一滚动区的正文
}

/** 卡片行配置 */
export interface CardRowOptions {
  icon: string; // 图标名或一个字符
  label: string; // 主文字
  desc?: string; // 次要文字
  right?: 'chevron' | 'check' | 'none'; // 右侧元素类型
  active?: boolean; // 是否为当前选中项
  onClick?: () => void; // 点击回调
}

/** 滑块卡片配置 */
export interface SliderCardOptions {
  min: number; // 最小值
  max: number; // 最大值
  step: number; // 步长
  value: number; // 当前值
  format: (value: number) => string; // 数值格式化
  onInput: (value: number) => void; // 拖动回调
}

/** 滑块卡片实例 */
export interface SliderCard {
  root: HTMLElement; // 卡片容器
  set: (value: number) => void; // 同步显示值
}

/** 开关行配置 */
export interface SwitchRowOptions {
  icon: string; // 图标名或一个字符
  label: string; // 主文字
  desc?: string; // 次要文字
  checked: boolean; // 初始是否打开
  onChange: (checked: boolean) => void; // 切换回调
}

/** 开关行实例 */
export interface SwitchRow {
  root: HTMLElement; // 卡片容器
  set: (checked: boolean) => void; // 同步开关状态
}

/**
 * 生成页壳，back 为 true 时页头带返回按钮
 */
export function pageShell(title: string, back: boolean, onBack?: () => void): PageShell {
  const page = document.createElement('div');
  page.className = 'page';

  const header = document.createElement('div');
  header.className = 'page-header';
  if (back) {
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'back';
    backButton.title = '返回';
    backButton.addEventListener('click', () => onBack?.());
    header.appendChild(backButton);
  }

  const titleEl = document.createElement('span');
  titleEl.className = 'page-title';
  titleEl.textContent = title;
  header.appendChild(titleEl);

  const body = document.createElement('div');
  body.className = 'page-body';

  page.append(header, body);
  return { page, header, body };
}

/**
 * 生成一张卡片行，点击区域占满整行
 */
export function cardRow(options: CardRowOptions): HTMLButtonElement {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'card-row';
  if (options.active) row.classList.add('active');

  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.appendChild(iconNode(options.icon, 20));

  const text = document.createElement('span');
  text.className = 'text';

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = options.label;
  text.appendChild(label);

  if (options.desc) {
    const desc = document.createElement('span');
    desc.className = 'desc';
    desc.textContent = options.desc;
    text.appendChild(desc);
  }

  row.append(icon, text);

  const right = options.right ?? 'chevron';
  if (right === 'chevron') {
    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.textContent = '›';
    row.appendChild(chevron);
  } else if (right === 'check') {
    const check = document.createElement('span');
    check.className = 'check';
    check.textContent = '✓';
    row.appendChild(check);
  }

  if (options.onClick) row.addEventListener('click', options.onClick);
  return row;
}

/**
 * 切换卡片行的选中状态，右侧勾选只创建一次，之后靠显隐切换
 */
export function setRowActive(row: HTMLElement, active: boolean): void {
  row.classList.toggle('active', active);
  let mark = row.querySelector<HTMLElement>('.check');
  if (!mark) {
    mark = document.createElement('span');
    mark.className = 'check';
    mark.textContent = '✓';
    row.appendChild(mark);
  }
  mark.style.display = active ? '' : 'none';
}

/**
 * 生成滑块卡片，返回容器与同步显示值的方法
 */
export function sliderCard(options: SliderCardOptions): SliderCard {
  const root = document.createElement('div');
  root.className = 'card slider-card';

  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'range';
  input.min = String(options.min);
  input.max = String(options.max);
  input.step = String(options.step);
  input.value = String(options.value);

  const value = document.createElement('span');
  value.className = 'range-value';
  value.textContent = options.format(options.value);

  input.addEventListener('input', () => {
    const next = parseFloat(input.value);
    value.textContent = options.format(next);
    options.onInput(next);
  });

  root.append(input, value);

  return {
    root,
    set(next: number) {
      input.value = String(next);
      value.textContent = options.format(next);
    },
  };
}

/**
 * 生成开关行：整行可点，右侧是滑动开关
 * 开关只负责显示状态，真实值由调用方写入设置
 */
export function switchRow(options: SwitchRowOptions): SwitchRow {
  const card = document.createElement('div');
  card.className = 'card';

  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'card-row switch-row';
  row.setAttribute('role', 'switch');

  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.appendChild(iconNode(options.icon, 20));

  const text = document.createElement('span');
  text.className = 'text';

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = options.label;
  text.appendChild(label);

  if (options.desc) {
    const desc = document.createElement('span');
    desc.className = 'desc';
    desc.textContent = options.desc;
    text.appendChild(desc);
  }

  const knob = document.createElement('span');
  knob.className = 'switch-knob';
  const toggle = document.createElement('span');
  toggle.className = 'switch';
  toggle.appendChild(knob);

  row.append(icon, text, toggle);
  card.appendChild(row);

  let checked = options.checked;

  function sync(): void {
    card.classList.toggle('on', checked);
    row.setAttribute('aria-checked', checked ? 'true' : 'false');
  }

  row.addEventListener('click', () => {
    checked = !checked;
    sync();
    options.onChange(checked);
  });

  sync();

  return {
    root: card,
    set(next: boolean) {
      checked = next;
      sync();
    },
  };
}
