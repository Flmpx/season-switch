/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */
import {
  type Settings,
  DEFAULT_ELEMENT_CONFIG,
  loadSettings,
  saveSettings,
} from '../../lib/settings';
import {
  ELEMENT_TYPES,
  getElementMeta,
  getElementDescriptor,
} from '../envir/particle';

// DOM 引用
const customMonthRow = document.getElementById('customMonthRow')!;
const customMonthSlider = document.getElementById(
  'customMonthSlider',
) as HTMLInputElement;
const customMonthValue = document.getElementById('customMonthValue')!;
const customHourRow = document.getElementById('customHourRow')!;
const customHourSlider = document.getElementById(
  'customHourSlider',
) as HTMLInputElement;
const customHourValue = document.getElementById('customHourValue')!;
const customIntensityRow = document.getElementById('customIntensityRow')!;
const customIntensitySlider = document.getElementById(
  'customIntensitySlider',
) as HTMLInputElement;
const customIntensityValue = document.getElementById(
  'customIntensityValue',
)!;

// 粒子按元素分别设置：属性枚举（元素列表来自 elements.json，零代码自动识别）
const PARTICLE_PROPS = ['speed', 'size', 'count'] as const;
// 每个属性对应的自定义数值字段
const CUSTOM_FIELD: Record<string, string> = {
  speed: 'customSpeed',
  size: 'customSize',
  count: 'customCount',
};

/* 生成单个属性的子设置块（按钮组 + 自定义滑块行） */
function buildSubSetting(
  type: string,
  prop: string,
  title: string,
  opts: [string, string][],
  unit: string,
  max: number,
  customVal: number,
): string {
  const buttons = opts
    .map(([val, label]) => `<button class="option-btn" data-value="${val}">${label}</button>`)
    .join('');
  return `
            <div class="sub-setting">
              <h4 class="sub-title">${title}</h4>
              <div class="option-grid" data-element="${type}" data-prop="${prop}">${buttons}</div>
              <div class="custom-row" data-element="${type}" data-prop="${prop}" data-unit="${unit}" style="display:none;">
                <input type="range" min="0" max="${max}" value="${customVal}" class="intensity-slider" />
                <span class="intensity-value">${customVal}${unit}</span>
              </div>
            </div>`;
}

/* 根据 elements.json 动态生成所有元素的设置分组 */
function buildParticleGroups(settings: Settings): string {
  const speedOpts: [string, string][] = [
    ['slow', '慢'],
    ['normal', '中'],
    ['fast', '快'],
    ['custom-speed', '自定义'],
  ];
  const sizeOpts: [string, string][] = [
    ['small', '小'],
    ['medium', '中'],
    ['large', '大'],
    ['custom-size', '自定义'],
  ];
  const countOpts: [string, string][] = [
    ['minimal', '微量'],
    ['few', '少量'],
    ['medium', '中等'],
    ['heavy', '大量'],
    ['custom-count', '自定义'],
  ];

  let html = '';
  for (const type of ELEMENT_TYPES) {
    const meta = getElementMeta(type);
    const desc = getElementDescriptor(type);
    const isTwinkle = desc?.behavior === 'twinkle';
    const cfg = (settings.particles[type] ?? DEFAULT_ELEMENT_CONFIG) as Record<string, any>;

    html += `<div class="element-setting"><h3 class="element-title">${meta.icon} ${meta.label}</h3>`;
    if (!isTwinkle) {
      html += buildSubSetting(type, 'speed', '速度', speedOpts, '%', 100, cfg.customSpeed ?? 50);
    }
    html += buildSubSetting(type, 'size', '大小', sizeOpts, '%', 100, cfg.customSize ?? 50);
    const countUnit = isTwinkle ? '个' : '个/分钟';
    const countMax = isTwinkle ? 150 : 1800;
    const countDefault = isTwinkle ? 60 : 50;
    html += buildSubSetting(type, 'count', '数目', countOpts, countUnit, countMax, cfg.customCount ?? countDefault);
    html += `</div>`;
  }
  return html;
}

/* 将选中态应用到普通选项按钮组（季节/时间/显示程度） */
function applyActiveState(key: string, value: string): void {
  const grid = document.querySelector(`.option-grid[data-key="${key}"]`);
  if (!grid) return;
  grid.querySelectorAll('.option-btn').forEach((btn) => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.value === value);
  });
}

/* 将选中态应用到某元素的粒子选项按钮组 */
function applyParticleActive(el: string, prop: string, value: string): void {
  const grid = document.querySelector(
    `.option-grid[data-element="${el}"][data-prop="${prop}"]`,
  );
  if (!grid) return;
  grid.querySelectorAll('.option-btn').forEach((btn) => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.value === value);
  });
}

/* 显示/隐藏自定义显示程度滑块 */
function updateIntensitySlider(intensity: string, customValue?: number): void {
  const show = intensity === 'custom-intensity';
  customIntensityRow.style.display = show ? 'flex' : 'none';
  if (customValue !== undefined) {
    customIntensitySlider.value = String(customValue);
    customIntensityValue.textContent = `${customValue}%`;
  }
}

/* 显示/隐藏自定义月份滑块 */
function updateMonthSelector(season: string, customMonth?: number): void {
  const show = season === 'custom-season';
  customMonthRow.style.display = show ? 'flex' : 'none';
  if (customMonth !== undefined) {
    customMonthSlider.value = String(customMonth);
    customMonthValue.textContent = `${customMonth}月`;
  }
}

/* 显示/隐藏自定义小时滑块 */
function updateHourSelector(timeOfDay: string, customHour?: number): void {
  const show = timeOfDay === 'custom-time';
  customHourRow.style.display = show ? 'flex' : 'none';
  if (customHour !== undefined) {
    customHourSlider.value = String(customHour);
    customHourValue.textContent = `${customHour}时`;
  }
}

/* 显示/隐藏某元素粒子属性的自定义滑块 */
function updateParticleCustomRow(
  el: string,
  prop: string,
  cfg: Record<string, any>,
): void {
  const row = document.querySelector<HTMLElement>(
    `.custom-row[data-element="${el}"][data-prop="${prop}"]`,
  );
  if (!row) return;
  const slider = row.querySelector('input') as HTMLInputElement;
  const valueSpan = row.querySelector('.intensity-value') as HTMLElement;
  const unit = row.dataset.unit ?? '%';
  const show = cfg[prop] === `custom-${prop}`;
  row.style.display = show ? 'flex' : 'none';
  if (show) {
    const val = cfg[CUSTOM_FIELD[prop]] as number;
    slider.value = String(val);
    valueSpan.textContent = `${val}${unit}`;
  }
}

/* 绑定季节/时间/显示程度选项按钮的点击事件 */
function initOptionGrids(settings: Settings): void {
  document.querySelectorAll('.option-grid[data-key]').forEach((grid) => {
    const key = (grid as HTMLElement).dataset.key!;

    grid.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const value = (btn as HTMLElement).dataset.value!;
        (settings as any)[key] = value;
        applyActiveState(key, value);

        if (key === 'season') {
          updateMonthSelector(value, settings.customMonth);
        }
        if (key === 'timeOfDay') {
          updateHourSelector(value, settings.customHour);
        }
        if (key === 'intensity') {
          updateIntensitySlider(value, settings.customIntensity);
        }

        await saveSettings(settings);
      });
    });
  });
}

/* 绑定每元素粒子选项按钮的点击事件 */
function initParticleGrids(settings: Settings): void {
  document
    .querySelectorAll<HTMLElement>('.option-grid[data-element]')
    .forEach((grid) => {
      const el = grid.dataset.element!;
      const prop = grid.dataset.prop!;
      grid.querySelectorAll<HTMLButtonElement>('.option-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const value = btn.dataset.value!;
          (settings.particles as any)[el][prop] = value;
          applyParticleActive(el, prop, value);
          updateParticleCustomRow(el, prop, (settings.particles as any)[el]);
          await saveSettings(settings);
        });
      });
    });
}

/* 绑定每元素粒子自定义滑块的输入事件 */
function initParticleSliders(settings: Settings): void {
  document
    .querySelectorAll<HTMLElement>('.custom-row[data-element]')
    .forEach((row) => {
      const el = row.dataset.element!;
      const prop = row.dataset.prop!;
      const slider = row.querySelector('input') as HTMLInputElement;
      const valueSpan = row.querySelector('.intensity-value') as HTMLElement;
      const unit = row.dataset.unit ?? '%';
      slider.addEventListener('input', async () => {
        const val = parseInt(slider.value, 10);
        (settings.particles as any)[el][CUSTOM_FIELD[prop]] = val;
        valueSpan.textContent = `${val}${unit}`;
        await saveSettings(settings);
      });
    });
}

/* 绑定自定义月份滑块 */
function initMonthSlider(settings: Settings): void {
  customMonthSlider.addEventListener('input', async () => {
    const val = parseInt(customMonthSlider.value, 10);
    settings.customMonth = val;
    customMonthValue.textContent = `${val}月`;
    await saveSettings(settings);
  });
}

/* 绑定自定义小时滑块 */
function initHourSlider(settings: Settings): void {
  customHourSlider.addEventListener('input', async () => {
    const val = parseInt(customHourSlider.value, 10);
    settings.customHour = val;
    customHourValue.textContent = `${val}时`;
    await saveSettings(settings);
  });
}

/* 绑定自定义显示程度滑块 */
function initSlider(settings: Settings): void {
  customIntensitySlider.addEventListener('input', async () => {
    const val = parseInt(customIntensitySlider.value, 10);
    settings.customIntensity = val;
    customIntensityValue.textContent = `${val}%`;
    await saveSettings(settings);
  });
}

/* 左侧导航切换右侧面板 */
function initTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.nav-item');
  const panels = document.querySelectorAll<HTMLElement>('.panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target!;
      tabs.forEach((t) => t.classList.toggle('active', t === tab));
      panels.forEach((p) =>
        p.classList.toggle('active', p.dataset.panel === target),
      );
    });
  });
}

/* 主流程：加载设置、生成动态 UI、绑定交互 */
async function main(): Promise<void> {
  const settings = await loadSettings();

  for (const type of ELEMENT_TYPES) {
    if (!settings.particles[type]) {
      settings.particles[type] = { ...DEFAULT_ELEMENT_CONFIG };
    }
  }

  const container = document.getElementById('particleGroups')!;
  container.innerHTML = buildParticleGroups(settings);

  applyActiveState('season', settings.season);
  applyActiveState('timeOfDay', settings.timeOfDay);
  applyActiveState('intensity', settings.intensity);
  updateIntensitySlider(settings.intensity, settings.customIntensity);
  updateMonthSelector(settings.season, settings.customMonth);
  updateHourSelector(settings.timeOfDay, settings.customHour);

  for (const el of ELEMENT_TYPES) {
    for (const prop of PARTICLE_PROPS) {
      const cfg = (settings.particles as any)[el] as Record<string, any>;
      if (!cfg) continue;
      applyParticleActive(el, prop, cfg[prop]);
      updateParticleCustomRow(el, prop, cfg);
    }
  }

  initTabs();
  initOptionGrids(settings);
  initParticleGrids(settings);
  initParticleSliders(settings);
  initMonthSlider(settings);
  initHourSlider(settings);
  initSlider(settings);
}

main();
