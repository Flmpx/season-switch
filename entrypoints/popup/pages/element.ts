/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { popPage, refreshHeight } from '../nav';
import { saveSettings, type Settings, type ParticleValue } from '../../../lib/settings';
import {
  registry,
  axisLabels,
  axisMax,
  axisPresets,
  axisStep,
  axisTitle,
  axisUnit,
  axisVisible,
  matchPreset,
  type Axis,
  type ElementDescriptor,
} from '../../envir/particle';

const AXES: Axis[] = ['speed', 'size', 'count'];

/* 渲染单个粒子元素的设置页（速度/大小/数目：档位 + 自定义数值） */
export function renderElementPage(id: string, settings: Settings): HTMLElement {
  const desc = registry.get(id);
  const page = document.createElement('div');
  page.className = 'page';

  if (!desc) {
    page.innerHTML = `
      <div class="page-header">
        <button class="back" type="button">返回</button>
        <span class="page-title">未知粒子</span>
      </div>
      <div class="page-body"></div>`;
    page.querySelector('.back')!.addEventListener('click', () => popPage());
    return page;
  }

  // 取当前值；缺失时以描述符 defaults 初始化并写回设置
  const value: ParticleValue = settings.particles[id] ?? { ...desc.defaults };
  if (!settings.particles[id]) settings.particles[id] = value;

  const sections = AXES.filter((axis) => axisVisible(axis, desc.behavior))
    .map((axis) => buildAxis(axis, desc))
    .join('');

  page.innerHTML = `
    <div class="page-header">
      <button class="back" type="button">返回</button>
      <span class="page-title">${desc.icon} ${desc.label}</span>
    </div>
    <div class="page-body">${sections}</div>`;

  page.querySelector('.back')!.addEventListener('click', () => popPage());

  for (const axis of AXES) {
    if (!axisVisible(axis, desc.behavior)) continue;
    bindAxis(page, axis, desc, value, settings);
  }

  return page;
}

/* 生成单轴 HTML：标题 + 档位按钮 + 自定义滑块行 */
function buildAxis(axis: Axis, desc: ElementDescriptor): string {
  const presets = axisPresets(axis, desc);
  const labels = axisLabels(axis);
  const buttons = presets
    .map((v, i) => `<button class="option-btn" type="button" data-preset="${i}">${labels[i] ?? v}</button>`)
    .join('');
  return `
    <div class="sub-setting" data-axis="${axis}">
      <h4 class="sub-title">${axisTitle(axis)}</h4>
      <div class="option-grid">
        ${buttons}
        <button class="option-btn" type="button" data-custom="1">自定义</button>
      </div>
      <div class="custom-row" style="display:none;">
        <input type="range" class="intensity-slider" min="0" max="${axisMax(axis, desc.behavior)}" step="${axisStep(axis)}" />
        <span class="intensity-value"></span>
      </div>
    </div>`;
}

/* 绑定单轴交互：档位点击 / 自定义展开 / 滑块拖动，均即时保存 */
function bindAxis(
  page: HTMLElement,
  axis: Axis,
  desc: ElementDescriptor,
  value: ParticleValue,
  settings: Settings,
): void {
  const block = page.querySelector<HTMLElement>(`[data-axis="${axis}"]`)!;
  const presets = axisPresets(axis, desc);
  const unit = axisUnit(axis, desc.behavior);
  const presetBtns = [...block.querySelectorAll<HTMLButtonElement>('[data-preset]')];
  const customBtn = block.querySelector<HTMLButtonElement>('[data-custom]')!;
  const row = block.querySelector<HTMLElement>('.custom-row')!;
  const slider = row.querySelector<HTMLInputElement>('input')!;
  const valSpan = row.querySelector<HTMLElement>('.intensity-value')!;

  // 当前是否处于"自定义"状态（值不落在任何档位，或用户主动展开）
  let customOpen = matchPreset(value[axis], presets) === -1;

  function refresh(): void {
    const idx = matchPreset(value[axis], presets);
    const inPreset = idx !== -1 && !customOpen;
    presetBtns.forEach((b, i) => b.classList.toggle('active', inPreset && i === idx));
    customBtn.classList.toggle('active', !inPreset);
    row.style.display = inPreset ? 'none' : 'flex';
    slider.value = String(value[axis]);
    valSpan.textContent = `${value[axis]}${unit}`;
  }

  async function commit(): Promise<void> {
    await saveSettings(settings);
    refreshHeight();
  }

  presetBtns.forEach((btn, i) => {
    btn.addEventListener('click', async () => {
      value[axis] = presets[i];
      customOpen = false;
      await commit();
      refresh();
    });
  });

  customBtn.addEventListener('click', () => {
    customOpen = true;
    refresh();
    refreshHeight(); // 展开自定义滑块后容器要重新测高，否则多出的行被 .pages 的 overflow 裁掉
  });

  slider.addEventListener('input', async () => {
    value[axis] = parseFloat(slider.value);
    valSpan.textContent = `${value[axis]}${unit}`;
    await commit();
  });

  refresh();
}
