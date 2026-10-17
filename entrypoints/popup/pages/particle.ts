import { pushPage, popPage } from '../nav';
import { ELEMENT_TYPES, getElementMeta } from '../../envir/particle';
import type { Settings } from '../../../lib/settings';
import { renderElementPage } from './element';

/* 渲染粒子设置页：元素列表，点元素进入其详细设置 */
export function renderParticlePage(settings: Settings): HTMLElement {
  const page = document.createElement('div');
  page.className = 'page';

  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML =
    '<button class="back" type="button">返回</button><span class="page-title">粒子</span>';
  page.appendChild(header);

  const body = document.createElement('div');
  body.className = 'page-body';

  for (const type of ELEMENT_TYPES) {
    const meta = getElementMeta(type);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'row';
    row.innerHTML = `<span class="row-label">${meta.icon} ${meta.label}</span><span class="chevron">›</span>`;
    row.addEventListener('click', () => pushPage(renderElementPage(type, settings)));
    body.appendChild(row);
  }

  page.appendChild(body);

  header.querySelector('.back')!.addEventListener('click', () => popPage());
  return page;
}
