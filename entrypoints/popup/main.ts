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

// ---- DOM refs ----
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

// 🍃❄️⭐ 粒子按元素分别设置：属性枚举（元素列表来自 elements.json，零代码自动识别）
const PARTICLE_PROPS = ['speed', 'size', 'count'] as const;
// 每个属性对应的自定义数值字段
const CUSTOM_FIELD: Record<string, string> = {
  speed: 'customSpeed',
  size: 'customSize',
  count: 'customCount',
};

// 生成单个属性的子设置块（按钮组 + 自定义滑块行）
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

// 根据 elements.json 动态生成所有元素的设置分组
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
    // 速度：闪烁类（静止）无速度项
    if (!isTwinkle) {
      html += buildSubSetting(type, 'speed', '速度', speedOpts, '%', 100, cfg.customSpeed ?? 50);
    }
    // 大小
    html += buildSubSetting(type, 'size', '大小', sizeOpts, '%', 100, cfg.customSize ?? 50);
    // 数目：飘落类=个/分钟（0~1800），闪烁类=午夜最大个（0~150）
    const countUnit = isTwinkle ? '个' : '个/分钟';
    const countMax = isTwinkle ? 150 : 1800;
    const countDefault = isTwinkle ? 60 : 50;
    html += buildSubSetting(type, 'count', '数目', countOpts, countUnit, countMax, cfg.customCount ?? countDefault);
    html += `</div>`;
  }
  return html;
}

// ---- Apply active state to option buttons ----
function applyActiveState(key: string, value: string): void {
  const grid = document.querySelector(`.option-grid[data-key="${key}"]`);
  if (!grid) return;
  grid.querySelectorAll('.option-btn').forEach((btn) => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.value === value);
  });
}

// ---- Apply active state to a per-element particle option grid ----
function applyParticleActive(el: string, prop: string, value: string): void {
  const grid = document.querySelector(
    `.option-grid[data-element="${el}"][data-prop="${prop}"]`,
  );
  if (!grid) return;
  grid.querySelectorAll('.option-btn').forEach((btn) => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.value === value);
  });
}

// ---- Show/hide custom intensity slider ----
function updateIntensitySlider(intensity: string, customValue?: number): void {
  const show = intensity === 'custom-intensity';
  customIntensityRow.style.display = show ? 'flex' : 'none';
  if (customValue !== undefined) {
    customIntensitySlider.value = String(customValue);
    customIntensityValue.textContent = `${customValue}%`;
  }
}

// ---- Show/hide custom month slider ----
function updateMonthSelector(season: string, customMonth?: number): void {
  const show = season === 'custom-season';
  customMonthRow.style.display = show ? 'flex' : 'none';
  if (customMonth !== undefined) {
    customMonthSlider.value = String(customMonth);
    customMonthValue.textContent = `${customMonth}月`;
  }
}

// ---- Show/hide custom hour slider ----
function updateHourSelector(timeOfDay: string, customHour?: number): void {
  const show = timeOfDay === 'custom-time';
  customHourRow.style.display = show ? 'flex' : 'none';
  if (customHour !== undefined) {
    customHourSlider.value = String(customHour);
    customHourValue.textContent = `${customHour}时`;
  }
}

// ---- Show/hide custom slider for a per-element particle prop ----
function updateParticleCustomRow(
  el: string,
  prop: string,
  cfg: Record<string, any>,
): void {
  const row = document.querySelector<HTMLElement>(
    `.custom-row[data-element="${el}"][data-prop="${prop}"]`,
  );
  if (!row) return; // 星光没有 speed 项，跳过
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

// ---- Bind click handlers for option grids (season / time / intensity) ----
function initOptionGrids(settings: Settings): void {
  document.querySelectorAll('.option-grid[data-key]').forEach((grid) => {
    const key = (grid as HTMLElement).dataset.key!;

    grid.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const value = (btn as HTMLElement).dataset.value!;
        (settings as any)[key] = value;
        applyActiveState(key, value);

        // Handle special cases
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

// ---- Bind click handlers for per-element particle option grids ----
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

// ---- Bind slider handlers for per-element particle custom sliders ----
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

// ---- Bind custom month slider ----
function initMonthSlider(settings: Settings): void {
  customMonthSlider.addEventListener('input', async () => {
    const val = parseInt(customMonthSlider.value, 10);
    settings.customMonth = val;
    customMonthValue.textContent = `${val}月`;
    await saveSettings(settings);
  });
}

// ---- Bind custom hour slider ----
function initHourSlider(settings: Settings): void {
  customHourSlider.addEventListener('input', async () => {
    const val = parseInt(customHourSlider.value, 10);
    settings.customHour = val;
    customHourValue.textContent = `${val}时`;
    await saveSettings(settings);
  });
}

// ---- Bind custom intensity slider ----
function initSlider(settings: Settings): void {
  customIntensitySlider.addEventListener('input', async () => {
    const val = parseInt(customIntensitySlider.value, 10);
    settings.customIntensity = val;
    customIntensityValue.textContent = `${val}%`;
    await saveSettings(settings);
  });
}

// ---- Tab switching (4 顶部标签分页) ----
function initTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  const panels = document.querySelectorAll<HTMLElement>('.tab-panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab!;
      tabs.forEach((t) => t.classList.toggle('active', t === tab));
      panels.forEach((p) =>
        p.classList.toggle('active', p.dataset.panel === target),
      );
    });
  });
}

// ---- Main ----
async function main(): Promise<void> {
  const settings = await loadSettings();

  // 确保每个 elements.json 中的元素在设置中都有配置（新元素首次自动落入默认）
  for (const type of ELEMENT_TYPES) {
    if (!settings.particles[type]) {
      settings.particles[type] = { ...DEFAULT_ELEMENT_CONFIG };
    }
  }

  // 动态生成粒子分组 UI（按 elements.json 的元素列表，零代码识别自定义元素）
  const container = document.getElementById('particleGroups')!;
  container.innerHTML = buildParticleGroups(settings);

  // Apply saved state
  applyActiveState('season', settings.season);
  applyActiveState('timeOfDay', settings.timeOfDay);
  applyActiveState('intensity', settings.intensity);
  updateIntensitySlider(settings.intensity, settings.customIntensity);
  updateMonthSelector(settings.season, settings.customMonth);
  updateHourSelector(settings.timeOfDay, settings.customHour);

  // 🍃❄️⭐ 粒子按元素分别恢复选中态与自定义滑块
  for (const el of ELEMENT_TYPES) {
    for (const prop of PARTICLE_PROPS) {
      const cfg = (settings.particles as any)[el] as Record<string, any>;
      if (!cfg) continue;
      applyParticleActive(el, prop, cfg[prop]);
      updateParticleCustomRow(el, prop, cfg);
    }
  }

  // Bind interactions
  initTabs();
  initOptionGrids(settings);
  initParticleGrids(settings);
  initParticleSliders(settings);
  initMonthSlider(settings);
  initHourSlider(settings);
  initSlider(settings);
}

main();
