/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { popPage, refreshHeight } from '../nav';
import { pageShell, sliderCard, type SliderCard } from '../ui';
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
  choiceValue,
  defaultParticleValue,
  middlePresetIndex,
  NUMERIC_LIMITS,
  type Axis,
  type ElementDescriptor,
  type NumericLimit,
} from '../../envir/particle';

const AXES: Axis[] = ['speed', 'size', 'count']; // 可调节的三个轴

/** 取某轴的取值范围 */
function limitOf(axis: Axis, desc: ElementDescriptor): NumericLimit {
  if (axis === 'speed') return NUMERIC_LIMITS.speed;
  if (axis === 'size') return NUMERIC_LIMITS.size;
  return desc.behavior === 'twinkle' ? NUMERIC_LIMITS.countTwinkle : NUMERIC_LIMITS.countFall;
}

/**
 * 渲染粒子设置页：每轴一组档位胶囊，选「自定义」时展开滑块
 */
export function renderElementPage(id: string, settings: Settings): HTMLElement {
  const desc = registry.get(id);
  const shell = pageShell(desc ? desc.label : '未知粒子', true, () => popPage());
  if (!desc) return shell.page;

  const value: ParticleValue = settings.particles[id] ?? defaultParticleValue(desc);
  if (!settings.particles[id]) settings.particles[id] = value;

  for (const axis of AXES) {
    if (!axisVisible(axis, desc.behavior)) continue;
    shell.body.append(...buildAxis(axis, desc, value, settings));
  }

  return shell.page;
}

/**
 * 生成单轴的标题、档位胶囊与自定义滑块，返回按顺序排列的节点
 * 取值解析、保存后重测高度、档位高亮与滑块显隐都在内部处理
 */
function buildAxis(
  axis: Axis,
  desc: ElementDescriptor,
  value: ParticleValue,
  settings: Settings,
): HTMLElement[] {
  const presets = axisPresets(axis, desc);
  const labels = axisLabels(axis);
  const limit = limitOf(axis, desc);
  const unit = axisUnit(axis, desc.behavior);

  const title = document.createElement('div');
  title.className = 'axis-title';
  title.textContent = axisTitle(axis);

  const card = document.createElement('div');
  card.className = 'card';

  const chips = document.createElement('div');
  chips.className = 'chips';

  let customOpen = value[axis].kind === 'custom';
  const presetButtons: HTMLButtonElement[] = [];
  let slider: SliderCard | null = null;

  function resolved(): number {
    return choiceValue(value[axis], presets, limit);
  }

  async function commit(): Promise<void> {
    await saveSettings(settings);
    refreshHeight();
  }

  function refresh(): void {
    const choice = value[axis];
    const index = choice.kind === 'preset' ? choice.index : -1;
    const inPreset = index !== -1 && !customOpen;
    presetButtons.forEach((button, i) => {
      button.classList.toggle('active', inPreset && i === index);
    });
    if (customButton) customButton.classList.toggle('active', !inPreset);
    if (slider) {
      slider.root.style.display = inPreset ? 'none' : 'flex';
      slider.set(resolved());
    }
  }

  for (let i = 0; i < presets.length; i += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = labels[i] ?? String(presets[i]);
    button.addEventListener('click', () => {
      value[axis] = { kind: 'preset', index: i };
      customOpen = false;
      void commit();
      refresh();
    });
    presetButtons.push(button);
    chips.appendChild(button);
  }

  const customButton = document.createElement('button');
  customButton.type = 'button';
  customButton.className = 'chip';
  customButton.textContent = '自定义';
  customButton.addEventListener('click', () => {
    const current = value[axis];
    if (current.kind !== 'custom') {
      const index = current.kind === 'preset' ? current.index : middlePresetIndex(presets.length);
      value[axis] = { kind: 'custom', value: presets[index] ?? limit.min };
      void commit();
    }
    customOpen = true;
    refresh();
    refreshHeight();
  });
  chips.appendChild(customButton);

  card.appendChild(chips);

  slider = sliderCard({
    min: limit.min,
    max: axisMax(axis, desc.behavior),
    step: axisStep(axis),
    value: resolved(),
    format: (v) => `${Number(v.toFixed(1))}${unit}`,
    onInput: (v) => {
      value[axis] = { kind: 'custom', value: v };
      void commit();
    },
  });
  card.appendChild(slider.root);

  refresh();
  return [title, card];
}
