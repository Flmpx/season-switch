/**
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/**
 * 出现区域选择器：在管理页上盖一层遮罩，拖动方框决定粒子出现的比例范围
 * 方框相对整个窗口的比例就是区域比例，不需要切换到其他网页
 */
import type { Region } from '../envir/particle/elements';

const MIN_SIZE = 40; // 方框的最小边长，单位为像素

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const; // 八个缩放手柄的方向

/** 缩放手柄方向 */
type HandleDir = (typeof HANDLES)[number];

const CURSORS: Record<HandleDir, string> = { // 手柄方向对应的光标
  nw: 'nwse-resize', // 左上
  n: 'ns-resize', // 上
  ne: 'nesw-resize', // 右上
  e: 'ew-resize', // 右
  se: 'nwse-resize', // 右下
  s: 'ns-resize', // 下
  sw: 'nesw-resize', // 左下
  w: 'ew-resize', // 左
};

/** 拖拽状态：移动整个方框或拉伸某条边 */
type DragMode = { kind: 'move' } | { kind: 'resize'; dir: HandleDir };

/** 方框几何，像素单位 */
interface Rect {
  left: number; // 左边距
  top: number; // 上边距
  width: number; // 宽度
  height: number; // 高度
}

let activeCloser: (() => void) | null = null; // 当前打开的选择器，同时只保留一个

/**
 * 打开区域选择器，返回用户确认的比例区域；取消时返回 null
 * 方框初始位置由传入的区域换算得到
 */
export function openRegionModal(initial: Region): Promise<Region | null> {
  activeCloser?.();

  const width = window.innerWidth;
  const height = window.innerHeight;

  const host = document.createElement('div');
  host.setAttribute('data-atmo-region', '');
  Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '2147483647' });
  const shadow = host.attachShadow({ mode: 'open' });

  const root = document.createElement('div');
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    background: 'rgba(15, 20, 28, 0.42)',
    font: '13px/1.4 -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    position: 'absolute',
    boxSizing: 'border-box',
    border: '2px solid #4a7bd8',
    background: 'rgba(74, 123, 216, 0.12)',
    cursor: 'move',
    touchAction: 'none',
  });

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed',
    top: '18px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '12px',
    background: '#ffffff',
    color: '#1f2328',
    boxShadow: '0 10px 30px rgba(15, 20, 28, 0.24)',
    userSelect: 'none',
    maxWidth: 'min(680px, calc(100vw - 48px))',
  });

  const tip = document.createElement('span');
  tip.textContent = '拖动方框选择粒子出现的范围';

  const size = document.createElement('span');
  Object.assign(size.style, { color: '#5a6472', minWidth: '88px', fontVariantNumeric: 'tabular-nums' });

  const cancel = document.createElement('button');
  cancel.textContent = '取消';
  Object.assign(cancel.style, {
    height: '32px',
    padding: '0 14px',
    border: '1px solid #d4d9e0',
    borderRadius: '8px',
    background: '#ffffff',
    color: '#333333',
    font: 'inherit',
    cursor: 'pointer',
  });

  const confirm = document.createElement('button');
  confirm.textContent = '确定';
  Object.assign(confirm.style, {
    height: '32px',
    padding: '0 18px',
    border: 'none',
    borderRadius: '8px',
    background: '#4a7bd8',
    color: '#ffffff',
    font: 'inherit',
    cursor: 'pointer',
  });

  panel.append(tip, size, cancel, confirm);

  let rect = clampRect({
    left: initial.x * width,
    top: initial.y * height,
    width: initial.w * width,
    height: initial.h * height,
  });
  let drag: DragMode | null = null;
  let origin = { x: 0, y: 0 };
  let startRect = rect;

  function paint() {
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
    size.textContent = `${Math.round((rect.width / width) * 100)}% × ${Math.round(
      (rect.height / height) * 100,
    )}%`;
  }

  function close(result: Region | null) {
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('keydown', onKey, true);
    host.remove();
    if (activeCloser === forceClose) activeCloser = null;
    resolveOnce(result);
  }

  function forceClose() {
    close(null);
  }

  function onMove(event: PointerEvent) {
    if (!drag) return;
    event.preventDefault();
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    rect =
      drag.kind === 'move'
        ? clampRect({ ...startRect, left: startRect.left + dx, top: startRect.top + dy })
        : resizeRect(startRect, drag.dir, dx, dy);
    paint();
  }

  function onUp() {
    drag = null;
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(null);
    }
  }

  function begin(event: PointerEvent, mode: DragMode) {
    event.preventDefault();
    event.stopPropagation();
    drag = mode;
    origin = { x: event.clientX, y: event.clientY };
    startRect = rect;
  }

  const handles: HTMLDivElement[] = [];
  for (const dir of HANDLES) {
    const handle = document.createElement('div');
    const x = dir.includes('w') ? 0 : dir.includes('e') ? 1 : 0.5;
    const y = dir.includes('n') ? 0 : dir.includes('s') ? 1 : 0.5;
    Object.assign(handle.style, {
      position: 'absolute',
      width: '12px',
      height: '12px',
      marginLeft: '-6px',
      marginTop: '-6px',
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      boxSizing: 'border-box',
      border: '2px solid #4a7bd8',
      borderRadius: '3px',
      background: '#ffffff',
      cursor: CURSORS[dir],
      touchAction: 'none',
    });
    handle.addEventListener('pointerdown', (event) => begin(event, { kind: 'resize', dir }));
    handles.push(handle);
  }

  box.addEventListener('pointerdown', (event) => begin(event, { kind: 'move' }));
  box.append(...handles);

  let resolveOnce: (value: Region | null) => void = () => undefined;
  const result = new Promise<Region | null>((resolve) => {
    resolveOnce = resolve;
  });

  cancel.addEventListener('click', () => close(null));
  confirm.addEventListener('click', () => close(toRegion(rect)));
  root.addEventListener('pointerdown', (event) => event.stopPropagation());

  root.append(box, panel);
  shadow.appendChild(root);
  document.documentElement.appendChild(host);
  paint();

  window.addEventListener('pointermove', onMove, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('keydown', onKey, true);
  activeCloser = forceClose;

  return result;
}

/** 把方框限制在窗口内并保证最小尺寸 */
function clampRect(rect: Rect): Rect {
  const maxW = window.innerWidth;
  const maxH = window.innerHeight;
  const width = Math.min(Math.max(rect.width, MIN_SIZE), maxW);
  const height = Math.min(Math.max(rect.height, MIN_SIZE), maxH);
  const left = Math.min(Math.max(rect.left, 0), maxW - width);
  const top = Math.min(Math.max(rect.top, 0), maxH - height);
  return { left, top, width, height };
}

/** 按拖拽方向调整方框 */
function resizeRect(start: Rect, dir: HandleDir, dx: number, dy: number): Rect {
  let { left, top, width, height } = start;
  if (dir.includes('w')) {
    const nextLeft = Math.min(start.left + dx, start.left + start.width - MIN_SIZE);
    width = start.left + start.width - nextLeft;
    left = nextLeft;
  }
  if (dir.includes('e')) width = start.width + dx;
  if (dir.includes('n')) {
    const nextTop = Math.min(start.top + dy, start.top + start.height - MIN_SIZE);
    height = start.top + start.height - nextTop;
    top = nextTop;
  }
  if (dir.includes('s')) height = start.height + dy;
  return clampRect({ left, top, width, height });
}

/** 把像素方框换算成 0-1 比例 */
function toRegion(rect: Rect): Region {
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  return { x: rect.left / w, y: rect.top / h, w: rect.width / w, h: rect.height / h };
}
