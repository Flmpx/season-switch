import { popPage, refreshHeight } from '../nav';
import {
  saveSettings,
  DEFAULT_ELEMENT_CONFIG,
  type Settings,
} from '../../../lib/settings';
import { getElementMeta, getElementDescriptor } from '../../envir/particle';

const PARTICLE_PROPS = ['speed', 'size', 'count'] as const;
const CUSTOM_FIELD: Record<string, string> = {
  speed: 'customSpeed',
  size: 'customSize',
  count: 'customCount',
};

const SPEED_OPTS: [string, string][] = [
  ['slow', '慢'],
  ['normal', '中'],
  ['fast', '快'],
  ['custom-speed', '自定义'],
];
const SIZE_OPTS: [string, string][] = [
  ['small', '小'],
  ['medium', '中'],
  ['large', '大'],
  ['custom-size', '自定义'],
];
const COUNT_OPTS: [string, string][] = [
  ['minimal', '微量'],
  ['few', '少量'],
  ['medium', '中等'],
  ['heavy', '大量'],
  ['custom-count', '自定义'],
];

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
    .map(([val, label]) => `<button class="option-btn" type="button" data-value="${val}">${label}</button>`)
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

/* 单个粒子元素的详细设置页（可继续下钻的叶子层） */
export function renderElementPage(type: string, settings: Settings): HTMLElement {
  const meta = getElementMeta(type);
  const desc = getElementDescriptor(type);
  const isTwinkle = desc?.behavior === 'twinkle';
  const cfg = (settings.particles[type] ?? DEFAULT_ELEMENT_CONFIG) as Record<string, any>;

  const page = document.createElement('div');
  page.className = 'page';

  let html = '';
  if (!isTwinkle) {
    html += buildSubSetting(type, 'speed', '速度', SPEED_OPTS, '%', 100, cfg.customSpeed ?? 50);
  }
  html += buildSubSetting(type, 'size', '大小', SIZE_OPTS, '%', 100, cfg.customSize ?? 50);
  const countUnit = isTwinkle ? '个' : '个/分钟';
  const countMax = isTwinkle ? 150 : 1800;
  const countDefault = isTwinkle ? 60 : 50;
  html += buildSubSetting(
    type,
    'count',
    '数目',
    COUNT_OPTS,
    countUnit,
    countMax,
    cfg.customCount ?? countDefault,
  );

  page.innerHTML = `
    <div class="page-header">
      <button class="back" type="button">返回</button>
      <span class="page-title">${meta.icon} ${meta.label}</span>
    </div>
    <div class="page-body">${html}</div>
  `;

  page.querySelector<HTMLButtonElement>('.back')!.addEventListener('click', () => popPage());

  for (const prop of PARTICLE_PROPS) {
    const grid = page.querySelector<HTMLElement>(
      `.option-grid[data-element="${type}"][data-prop="${prop}"]`,
    );
    if (!grid) continue;

    grid.querySelectorAll<HTMLButtonElement>('.option-btn').forEach((btn) => {
      if (btn.dataset.value === cfg[prop]) btn.classList.add('active');
      btn.addEventListener('click', async () => {
        const value = btn.dataset.value!;
        cfg[prop] = value;
        grid
          .querySelectorAll<HTMLButtonElement>('.option-btn')
          .forEach((b) => b.classList.toggle('active', b === btn));
        const row = page.querySelector<HTMLElement>(
          `.custom-row[data-element="${type}"][data-prop="${prop}"]`,
        );
        const show = value === `custom-${prop}`;
        if (row) {
          row.style.display = show ? 'flex' : 'none';
          if (show) {
            const slider = row.querySelector('input') as HTMLInputElement;
            const val = cfg[CUSTOM_FIELD[prop]] as number;
            slider.value = String(val);
            (row.querySelector('.intensity-value') as HTMLElement).textContent = `${val}${row.dataset.unit ?? '%'}`;
          }
        }
        refreshHeight(); // 自定义行显隐改变内容高度，重新做高度过渡
        await saveSettings(settings);
      });
    });

    const row = page.querySelector<HTMLElement>(
      `.custom-row[data-element="${type}"][data-prop="${prop}"]`,
    );
    if (row && cfg[prop] === `custom-${prop}`) row.style.display = 'flex';
    if (row) {
      const slider = row.querySelector('input') as HTMLInputElement;
      const valueSpan = row.querySelector('.intensity-value') as HTMLElement;
      const unit = row.dataset.unit ?? '%';
      slider.addEventListener('input', async () => {
        const val = parseInt(slider.value, 10);
        cfg[CUSTOM_FIELD[prop]] = val;
        valueSpan.textContent = `${val}${unit}`;
        await saveSettings(settings);
      });
    }
  }

  return page;
}
