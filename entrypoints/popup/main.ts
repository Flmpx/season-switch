/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */
import {
  type Settings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../../lib/settings';

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

// 🍃❄️⭐ 粒子按元素分别设置：元素与属性枚举
const PARTICLE_ELEMENTS = ['leaf', 'snow', 'star'] as const;
const PARTICLE_PROPS = ['speed', 'size', 'count'] as const;
// 每个属性对应的自定义数值字段
const CUSTOM_FIELD: Record<string, string> = {
  speed: 'customSpeed',
  size: 'customSize',
  count: 'customCount',
};

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

  // Apply saved state
  applyActiveState('season', settings.season);
  applyActiveState('timeOfDay', settings.timeOfDay);
  applyActiveState('intensity', settings.intensity);
  updateIntensitySlider(settings.intensity, settings.customIntensity);
  updateMonthSelector(settings.season, settings.customMonth);
  updateHourSelector(settings.timeOfDay, settings.customHour);

  // 🍃❄️⭐ 粒子按元素分别恢复选中态与自定义滑块
  for (const el of PARTICLE_ELEMENTS) {
    for (const prop of PARTICLE_PROPS) {
      const cfg = (settings.particles as any)[el] as Record<string, any>;
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
