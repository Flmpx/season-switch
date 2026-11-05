/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/**
 * 界面图标：用内联 SVG 线条图形替代 emoji
 * 图标名写在元素数据的 icon 字段里，渲染时按名字换图形
 * 不是图标名的值（用户自己填的 emoji 或字符）原样显示
 */

/** 可用图标名 */
export type IconName =
  | 'leaf'
  | 'snow'
  | 'sparkle'
  | 'clock'
  | 'sun'
  | 'sprout'
  | 'calendar'
  | 'monitor'
  | 'sunrise'
  | 'sunset'
  | 'moon'
  | 'star'
  | 'cloud'
  | 'cloudsun'
  | 'mist'
  | 'level'
  | 'plus'
  | 'list'
  | 'image'
  | 'text'
  | 'emoji';

/** 图标名到 SVG 内容的映射 */
const BODIES: Record<IconName, string> = {
  leaf: '<path d="M4 20c0-8.5 6.5-15 16-15 0 9.5-6.5 15-16 15Z"/><path d="M4 20 20 4"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
  sparkle: '<path d="M12 3.5 13.9 9l5.6 2-5.6 1.9L12 18.5 10.1 12.9 4.5 11l5.6-2Z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>',
  sprout:
    '<path d="M12 21v-7"/><path d="M12 14c0-3.3-2.2-5.5-5.5-5.5C6.5 11.8 8.7 14 12 14Z"/><path d="M12 14c0-3.3 2.2-5.5 5.5-5.5C17.5 11.8 15.3 14 12 14Z"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  monitor:
    '<rect x="2.5" y="4.5" width="19" height="12.5" rx="2"/><path d="M8 20.5h8M12 17v3.5"/>',
  sunrise:
    '<path d="M3 19h18"/><path d="M7.5 19a4.5 4.5 0 0 1 9 0"/><path d="M12 3v3M4.8 8.2l2 2M19.2 8.2l-2 2"/>',
  sunset:
    '<path d="M3 19h18"/><path d="M7.5 19a4.5 4.5 0 0 1 9 0"/><path d="M12 3v6M9.5 6.5 12 9l2.5-2.5"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/>',
  star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9L3.5 9.7l5.9-.8Z"/>',
  cloud: '<path d="M7.5 18.5a4.5 4.5 0 0 1-.4-9 5.6 5.6 0 0 1 10.7-1.2 3.9 3.9 0 0 1-.6 7.8Z"/>',
  cloudsun:
    '<circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.8v1.4M2.8 8.5h1.4M4.4 4.4l1 1M12.6 4.4l-1 1"/>' +
    '<path d="M9.5 20.5a4 4 0 0 1-.3-8 5 5 0 0 1 9.5-1 3.5 3.5 0 0 1-.5 7Z"/>',
  mist: '<path d="M4 8h16M6 12h12M3.5 16h17"/>',
  level:
    '<path d="M4 7h9M4 12h4M4 17h11"/><circle cx="15" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>' +
    '<path d="M17 7h3M12 12h8M19 17h1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  list: '<path d="M8 6.5h12M8 12h12M8 17.5h12"/><circle cx="4.5" cy="6.5" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="17.5" r="1"/>',
  image:
    '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17 4.6-4.3 3.4 3 2.6-2.3 4.4 4"/>',
  text: '<path d="M5 6.5h14M12 6.5v12M9 18.5h6"/>',
  emoji:
    '<circle cx="12" cy="12" r="8.5"/><path d="M8.8 14.2c.9 1.2 1.9 1.8 3.2 1.8s2.3-.6 3.2-1.8"/><circle cx="9.3" cy="9.8" r=".9"/><circle cx="14.7" cy="9.8" r=".9"/>',
};

/** 判断一个值是否是内置图标名 */
export function isIconName(value: string): value is IconName {
  return Object.prototype.hasOwnProperty.call(BODIES, value);
}

/** 取图标的 SVG 字符串，不是图标名时返回空串 */
export function iconSvg(name: string, size = 18): string {
  if (!isIconName(name)) return '';
  return (
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor"` +
    ` stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${BODIES[name]}</svg>`
  );
}

/** 生成图标节点：图标名出 SVG，其余原样当字符渲染 */
export function iconNode(value: string, size = 18): HTMLElement {
  const node = document.createElement('span');
  node.className = 'icon-glyph';
  if (isIconName(value)) node.innerHTML = iconSvg(value, size);
  else node.textContent = value;
  return node;
}

/** 把图标填进已有元素，用于只换图标不换容器的场景 */
export function setIcon(target: HTMLElement, value: string, size = 18): void {
  target.replaceChildren(iconNode(value, size));
}
