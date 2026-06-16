import {
  type Settings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../../lib/settings';

// ---- DOM refs ----
const customMonthRow = document.getElementById('customMonthRow')!;
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

// ---- Show/hide month selector ----
function updateMonthSelector(season: string, customMonth?: number): void {
  const show = season === 'custom-season';
  customMonthRow.style.display = show ? 'block' : 'none';
  if (show && customMonth !== undefined) {
    document.querySelectorAll('.month-btn').forEach((btn) => {
      btn.classList.toggle(
        'active',
        (btn as HTMLElement).dataset.month === String(customMonth),
      );
    });
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

// ---- Bind month selector ----
function initMonthGrid(settings: Settings): void {
  document.querySelectorAll('.month-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const month = parseInt((btn as HTMLElement).dataset.month!, 10);
      settings.customMonth = month;
      document.querySelectorAll('.month-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      await saveSettings(settings);
    });
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

  // Bind interactions
  initOptionGrids(settings);
  initMonthGrid(settings);
  initSlider(settings);
  initParticleSlider(settings);
  initParticleSizeSlider(settings);
}

main();
