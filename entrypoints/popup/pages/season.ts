import { popPage, refreshHeight } from '../nav';
import { saveSettings, type Settings } from '../../../lib/settings';

const SEASON_OPTS: [string, string][] = [
  ['spring', '春'],
  ['summer', '夏'],
  ['autumn', '秋'],
  ['winter', '冬'],
  ['custom-season', '自定义'],
  ['system-season', '跟随系统'],
];

export function renderSeasonPage(settings: Settings): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <div class="page-header">
      <button class="back" type="button">返回</button>
      <span class="page-title">季节</span>
    </div>
    <div class="page-body">
      <div class="option-grid" data-key="season">
        ${SEASON_OPTS.map(([v, l]) => `<button class="option-btn" type="button" data-value="${v}">${l}</button>`).join('')}
      </div>
      <div class="custom-row" data-custom="custom-season" style="display:none;">
        <input type="range" min="1" max="12" value="${settings.customMonth}" class="intensity-slider" />
        <span class="intensity-value">${settings.customMonth}月</span>
      </div>
    </div>
  `;

  page.querySelector<HTMLButtonElement>('.back')!.addEventListener('click', () => popPage());

  const grid = page.querySelector<HTMLElement>('.option-grid')!;
  grid.querySelectorAll<HTMLButtonElement>('.option-btn').forEach((btn) => {
    if (btn.dataset.value === settings.season) btn.classList.add('active');
    btn.addEventListener('click', async () => {
      const value = btn.dataset.value!;
      settings.season = value;
      grid
        .querySelectorAll<HTMLButtonElement>('.option-btn')
        .forEach((b) => b.classList.toggle('active', b === btn));
      const customRow = page.querySelector<HTMLElement>('.custom-row')!;
      customRow.style.display = value === 'custom-season' ? 'flex' : 'none';
      refreshHeight(); // 自定义行显隐会改变内容高度，重新做高度过渡
      await saveSettings(settings);
    });
  });

  const slider = page.querySelector<HTMLInputElement>('.custom-row input')!;
  const valueSpan = page.querySelector<HTMLElement>('.custom-row .intensity-value')!;
  slider.addEventListener('input', async () => {
    const val = parseInt(slider.value, 10);
    settings.customMonth = val;
    valueSpan.textContent = `${val}月`;
    await saveSettings(settings);
  });

  return page;
}
