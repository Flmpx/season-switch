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

// ---- Main ----
async function main(): Promise<void> {
  const settings = await loadSettings();

  // Apply saved state
  applyActiveState('season', settings.season);
  applyActiveState('timeOfDay', settings.timeOfDay);
  applyActiveState('intensity', settings.intensity);
  updateIntensitySlider(settings.intensity, settings.customIntensity);
  updateMonthSelector(settings.season, settings.customMonth);

  // Bind interactions
  initOptionGrids(settings);
  initMonthGrid(settings);
  initSlider(settings);
}

main();
