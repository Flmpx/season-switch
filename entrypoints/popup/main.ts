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
const customParticleRow = document.getElementById('customParticleRow')!;
const customParticleSlider = document.getElementById(
  'customParticleSlider',
) as HTMLInputElement;
const customParticleValue = document.getElementById(
  'customParticleValue',
)!;
const customParticleSizeRow = document.getElementById('customParticleSizeRow')!;
const customParticleSizeSlider = document.getElementById(
  'customParticleSizeSlider',
) as HTMLInputElement;
const customParticleSizeValue = document.getElementById(
  'customParticleSizeValue',
)!;

// ---- Apply active state to option buttons ----
function applyActiveState(key: string, value: string): void {
  const grid = document.querySelector(`.option-grid[data-key="${key}"]`);
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

// ---- Show/hide custom particle count slider ----
function updateParticleSlider(particleCount: string, customValue?: number): void {
  const show = particleCount === 'custom-particle';
  customParticleRow.style.display = show ? 'flex' : 'none';
  if (customValue !== undefined) {
    customParticleSlider.value = String(customValue);
    customParticleValue.textContent = `${customValue}个/分钟`;
  }
}

// ---- Show/hide custom particle size slider ----
function updateParticleSizeSlider(particleSize: string, customValue?: number): void {
  const show = particleSize === 'custom-size';
  customParticleSizeRow.style.display = show ? 'flex' : 'none';
  if (customValue !== undefined) {
    customParticleSizeSlider.value = String(customValue);
    customParticleSizeValue.textContent = `${customValue}%`;
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

// ---- Bind click handlers for option grids ----
function initOptionGrids(settings: Settings): void {
  document.querySelectorAll('.option-grid').forEach((grid) => {
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
        if (key === 'particleCount') {
          updateParticleSlider(value, settings.customParticleCount);
        }
        if (key === 'particleSize') {
          updateParticleSizeSlider(value, settings.customParticleSize);
        }

        await saveSettings(settings);
      });
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

// ---- Bind custom particle count slider ----
function initParticleSlider(settings: Settings): void {
  customParticleSlider.addEventListener('input', async () => {
    const val = parseInt(customParticleSlider.value, 10);
    settings.customParticleCount = val;
    customParticleValue.textContent = `${val}个/分钟`;
    await saveSettings(settings);
  });
}

// ---- Bind custom particle size slider ----
function initParticleSizeSlider(settings: Settings): void {
  customParticleSizeSlider.addEventListener('input', async () => {
    const val = parseInt(customParticleSizeSlider.value, 10);
    settings.customParticleSize = val;
    customParticleSizeValue.textContent = `${val}%`;
    await saveSettings(settings);
  });
}

// ---- Main ----
async function main(): Promise<void> {
  const settings = await loadSettings();

  // Apply saved state
  applyActiveState('season', settings.season);
  applyActiveState('timeOfDay', settings.timeOfDay);
  applyActiveState('intensity', settings.intensity);
  applyActiveState('particleCount', settings.particleCount);
  applyActiveState('particleSize', settings.particleSize);
  updateIntensitySlider(settings.intensity, settings.customIntensity);
  updateParticleSlider(settings.particleCount, settings.customParticleCount);
  updateParticleSizeSlider(settings.particleSize, settings.customParticleSize);
  updateMonthSelector(settings.season, settings.customMonth);
  updateHourSelector(settings.timeOfDay, settings.customHour);

  // Bind interactions
  initOptionGrids(settings);
  initMonthSlider(settings);
  initHourSlider(settings);
  initSlider(settings);
  initParticleSlider(settings);
  initParticleSizeSlider(settings);
}

main();
