import { popPage, refreshHeight } from '../nav';
import { saveSettings, type Settings } from '../../../lib/settings';

const TIME_OPTS: [string, string][] = [
  ['dawn', '清晨'],
  ['morning', '上午'],
  ['noon', '中午'],
  ['afternoon', '下午'],
  ['dusk', '傍晚'],
  ['evening', '晚上'],
  ['midnight', '深夜'],
  ['custom-time', '自定义'],
  ['system-time', '跟随系统'],
];

export function renderTimePage(settings: Settings): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <div class="page-header">
      <button class="back" type="button">返回</button>
      <span class="page-title">时间</span>
    </div>
    <div class="page-body">
      <div class="option-grid" data-key="timeOfDay">
        ${TIME_OPTS.map(([v, l]) => `<button class="option-btn" type="button" data-value="${v}">${l}</button>`).join('')}
      </div>
      <div class="custom-row" data-custom="custom-time" style="display:none;">
        <input type="range" min="0" max="23" value="${settings.customHour}" class="intensity-slider" />
        <span class="intensity-value">${settings.customHour}时</span>
      </div>
    </div>
  `;

  page.querySelector<HTMLButtonElement>('.back')!.addEventListener('click', () => popPage());

  const grid = page.querySelector<HTMLElement>('.option-grid')!;
  grid.querySelectorAll<HTMLButtonElement>('.option-btn').forEach((btn) => {
    if (btn.dataset.value === settings.timeOfDay) btn.classList.add('active');
    btn.addEventListener('click', async () => {
      const value = btn.dataset.value!;
      settings.timeOfDay = value;
      grid
        .querySelectorAll<HTMLButtonElement>('.option-btn')
        .forEach((b) => b.classList.toggle('active', b === btn));
      const customRow = page.querySelector<HTMLElement>('.custom-row')!;
      customRow.style.display = value === 'custom-time' ? 'flex' : 'none';
      refreshHeight();
      await saveSettings(settings);
    });
  });

  const slider = page.querySelector<HTMLInputElement>('.custom-row input')!;
  const valueSpan = page.querySelector<HTMLElement>('.custom-row .intensity-value')!;
  slider.addEventListener('input', async () => {
    const val = parseInt(slider.value, 10);
    settings.customHour = val;
    valueSpan.textContent = `${val}时`;
    await saveSettings(settings);
  });

  return page;
}
