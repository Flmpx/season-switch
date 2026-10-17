import { pushPage } from '../nav';
import { renderSeasonPage } from './season';
import { renderTimePage } from './time';
import { renderDisplayPage } from './display';
import { renderParticlePage } from './particle';
import type { Settings } from '../../../lib/settings';

interface MainItem {
  label: string; // 主选项显示文字
  render: (s: Settings) => HTMLElement; // 点击后渲染的子页面
}

/* 主页选项：[显示文字, 渲染函数] */
const ITEMS: MainItem[] = [
  { label: '季节', render: renderSeasonPage },
  { label: '时间', render: renderTimePage },
  { label: '显示程度', render: renderDisplayPage },
  { label: '粒子', render: renderParticlePage },
];

/* 渲染主页：四个主选项入口 */
export function renderMainPage(settings: Settings): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page';

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = '<span class="page-title">设置</span>';
  page.appendChild(header);

  const body = document.createElement('div');
  body.className = 'page-body';

  for (const item of ITEMS) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'row';
    row.innerHTML =
      '<span class="row-label"></span><span class="chevron">›</span>';
    (row.querySelector('.row-label') as HTMLElement).textContent = item.label;
    row.addEventListener('click', () => pushPage(item.render(settings)));
    body.appendChild(row);
  }

  page.appendChild(body);
  return page;
}
