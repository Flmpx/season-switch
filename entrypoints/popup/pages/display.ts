/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import { popPage, refreshHeight } from '../nav';
import { saveSettings, type Settings } from '../../../lib/settings';

/* 显示程度选项：[值, 显示文字] */
const INTENSITY_OPTS: [string, string][] = [
  ['misty', '朦朦'],
  ['light', '浅'],
  ['medium', '中'],
  ['deep', '深'],
  ['custom-intensity', '自定义'],
];

/* 渲染显示程度设置页 */
export function renderDisplayPage(settings: Settings): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <div class="page-header">
      <button class="back" type="button">返回</button>
      <span class="page-title">显示程度</span>
    </div>
    <div class="page-body">
      <div class="option-grid" data-key="intensity">
        ${INTENSITY_OPTS.map(([v, l]) => `<button class="option-btn" type="button" data-value="${v}">${l}</button>`).join('')}
      </div>
      <div class="custom-row" data-custom="custom-intensity" style="display:none;">
        <input type="range" min="0" max="100" value="${settings.customIntensity}" class="intensity-slider" />
        <span class="intensity-value">${settings.customIntensity}%</span>
      </div>
    </div>
  `;

  page.querySelector<HTMLButtonElement>('.back')!.addEventListener('click', () => popPage());

  const grid = page.querySelector<HTMLElement>('.option-grid')!;
  grid.querySelectorAll<HTMLButtonElement>('.option-btn').forEach((btn) => {
    if (btn.dataset.value === settings.intensity) btn.classList.add('active');
    btn.addEventListener('click', async () => {
      const value = btn.dataset.value!;
      settings.intensity = value;
      grid
        .querySelectorAll<HTMLButtonElement>('.option-btn')
        .forEach((b) => b.classList.toggle('active', b === btn));
      const customRow = page.querySelector<HTMLElement>('.custom-row')!;
      customRow.style.display = value === 'custom-intensity' ? 'flex' : 'none';
      refreshHeight();
      await saveSettings(settings);
    });
  });

  const slider = page.querySelector<HTMLInputElement>('.custom-row input')!;
  const valueSpan = page.querySelector<HTMLElement>('.custom-row .intensity-value')!;
  slider.addEventListener('input', async () => {
    const val = parseInt(slider.value, 10);
    settings.customIntensity = val;
    valueSpan.textContent = `${val}%`;
    await saveSettings(settings);
  });

  return page;
}
