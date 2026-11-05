/**
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/**
 * 管理页表单控件工厂：白卡片样式，表单状态由调用方持有
 */

/** 创建元素节点 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 可折叠分组：root 挂到页面上，body 用来塞字段 */
export interface Group {
  root: HTMLElement; // 根节点
  body: HTMLElement; // 字段容器
  setOpen(open: boolean): void; // 展开或收起
}

const GROUP_ANIM_MS = 260; // 展开动画时长，需与 style.css 保持一致

/**
 * 可折叠分组
 * 不用 details：它的展开高度无法过渡，会直接跳开
 * 改用高度过渡，先量 scrollHeight，结束后设回 auto
 * 展开与收起前强制回流，避免过渡被浏览器合并
 */
export function group(title: string, open = true): Group {
  const root = h('div', 'group');
  const head = h('button', 'group-title');
  head.type = 'button';
  head.append(h('span', 'group-arrow', '▸'), h('span', 'group-name', title));

  const panel = h('div', 'group-panel');
  const body = h('div', 'group-body');
  panel.appendChild(body);
  root.append(head, panel);

  let opened = false;
  let timer = 0;

  function expand(): void {
    if (opened) return;
    opened = true;
    root.classList.add('open');
    head.setAttribute('aria-expanded', 'true');
    window.clearTimeout(timer);
    panel.style.height = '0px';
    void panel.offsetHeight;
    panel.style.height = `${body.scrollHeight}px`;
    timer = window.setTimeout(() => {
      if (!opened) return;
      panel.style.height = 'auto';
      root.classList.add('settled');
    }, GROUP_ANIM_MS);
  }

  function collapse(): void {
    if (!opened) return;
    opened = false;
    root.classList.remove('open');
    root.classList.remove('settled');
    head.setAttribute('aria-expanded', 'false');
    window.clearTimeout(timer);
    panel.style.height = `${body.scrollHeight}px`;
    void panel.offsetHeight;
    panel.style.height = '0px';
  }

  head.addEventListener('click', () => {
    if (opened) collapse();
    else expand();
  });

  if (open) {
    opened = true;
    root.classList.add('open');
    root.classList.add('settled');
    panel.style.height = 'auto';
  } else {
    panel.style.height = '0px';
  }
  head.setAttribute('aria-expanded', String(opened));

  return {
    root,
    body,
    setOpen: (next) => {
      if (next) expand();
      else collapse();
    },
  };
}

/** 分组内的小标题，tip 为鼠标悬浮时显示的说明 */
export function subTitle(text: string, tip?: string): HTMLElement {
  const root = h('div', 'sub-title', text);
  if (tip) {
    root.dataset.tip = tip;
    root.classList.add('has-tip');
  }
  return root;
}

/** 一行：左标签、右控件，tip 悬浮在标签上才显示 */
export function row(label: string, control: HTMLElement, tip?: string): HTMLElement {
  const root = h('div', 'field');
  const labelEl = h('span', 'field-label', label);
  if (tip) {
    labelEl.dataset.tip = tip;
    labelEl.classList.add('has-tip');
  }
  root.append(labelEl, control);
  return root;
}

/** 说明文字 */
export function hint(text: string): HTMLElement {
  return h('span', 'field-hint', text);
}

/** 单行输入框 */
export function inputText(
  value: string,
  onChange: (v: string) => void,
  placeholder = '',
): HTMLInputElement {
  const input = h('input', 'input');
  input.type = 'text';
  input.value = value;
  input.placeholder = placeholder;
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

/** 多行输入框 */
export function inputArea(
  value: string,
  rows: number,
  onChange: (v: string) => void,
  placeholder = '',
): HTMLTextAreaElement {
  const area = h('textarea', 'input textarea');
  area.rows = rows;
  area.value = value;
  area.placeholder = placeholder;
  area.spellcheck = false;
  area.addEventListener('input', () => onChange(area.value));
  return area;
}

/** 颜色选择器 */
export function colorPicker(value: string, onChange: (v: string) => void): HTMLInputElement {
  const input = h('input', 'input color');
  input.type = 'color';
  input.value = normalizeColor(value);
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

/** 颜色统一成 #rrggbb，颜色输入框只接受该格式 */
function normalizeColor(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const named: Record<string, string> = {
    white: '#ffffff',
    black: '#000000',
    red: '#ff0000',
    green: '#00aa00',
    blue: '#0066ff',
    yellow: '#ffff00',
    orange: '#ff9900',
  };
  const hit = named[color.toLowerCase()];
  if (hit) return hit;
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
  if (rgb) {
    const to2 = (n: number) => Number(n).toString(16).padStart(2, '0');
    return `#${to2(+rgb[1])}${to2(+rgb[2])}${to2(+rgb[3])}`;
  }
  return '#ffffff';
}

/** 滑块参数：范围、单位、显示小数位 */
export interface SliderSpec {
  min: number; // 最小值
  max: number; // 最大值
  step: number; // 步长
  unit?: string; // 单位后缀
  digits?: number; // 小数位，缺省按步长推断
}

/** 按步长的小数位推断显示精度 */
function decimalsOf(step: number): number {
  if (step >= 1) return 0;
  const text = String(step);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}

/** 对齐步长并夹进区间，消除浮点误差 */
function roundToStep(value: number, spec: SliderSpec): number {
  const snapped = spec.min + Math.round((value - spec.min) / spec.step) * spec.step;
  return Math.min(spec.max, Math.max(spec.min, Number(snapped.toFixed(6))));
}

/** 格式化读数，拼上单位 */
function formatValue(value: number, spec: SliderSpec): string {
  return `${value.toFixed(spec.digits ?? decimalsOf(spec.step))}${spec.unit ?? ''}`;
}

/** 轨道上的一个滑块：气泡里的名称与当前值 */
export interface TrackThumb {
  label: string; // 名称，留空则气泡只显示数值
  value: number; // 当前值
}

/**
 * 自绘滑块轨道：单个或多个圆点共用一条轨道
 * 读数放在圆点上方的气泡里，只在悬浮、键盘聚焦或拖动时出现
 * 点轨道任意位置会跳过去并接着拖动，方向键可逐步微调
 * 点在圆点本身时不跳位，避免指针轻微偏移就带动数值
 */
function createTrack(
  thumbs: ReadonlyArray<TrackThumb>,
  spec: SliderSpec,
  onChange: (index: number, value: number) => void,
): HTMLElement {
  const root = h('div', 'track');
  const area = h('div', 'track-area');
  const rail = h('div', 'track-rail');
  area.appendChild(rail);
  root.appendChild(area);

  const values = thumbs.map((thumb) => roundToStep(thumb.value, spec));
  const span = Math.max(1e-6, spec.max - spec.min);
  const digits = spec.digits ?? decimalsOf(spec.step);
  const unit = spec.unit ?? '';
  const valueWidth = Math.max(spec.min.toFixed(digits).length, spec.max.toFixed(digits).length);
  const handles: HTMLElement[] = [];
  const tipValues: HTMLElement[] = [];
  let dragging = -1;

  function percentOf(value: number): number {
    return ((value - spec.min) / span) * 100;
  }

  function paint(index: number): void {
    handles[index].style.left = `${percentOf(values[index])}%`;
    handles[index].setAttribute('aria-valuenow', String(values[index]));
    handles[index].setAttribute('aria-valuetext', formatValue(values[index], spec));
    tipValues[index].textContent = values[index].toFixed(digits);
  }

  function valueAt(clientX: number): number {
    const rect = rail.getBoundingClientRect();
    const ratio = (clientX - rect.left) / Math.max(1, rect.width);
    return spec.min + ratio * span;
  }

  function setValue(index: number, raw: number): void {
    const low = index === 0 ? spec.min : values[index - 1] + spec.step;
    const high = index === values.length - 1 ? spec.max : values[index + 1] - spec.step;
    const next = Math.min(high, Math.max(low, roundToStep(raw, spec)));
    if (next === values[index]) return;
    values[index] = next;
    paint(index);
    onChange(index, next);
  }

  function nearestIndex(clientX: number): number {
    const target = valueAt(clientX);
    let best = 0;
    for (let i = 1; i < values.length; i += 1) {
      if (Math.abs(values[i] - target) < Math.abs(values[best] - target)) best = i;
    }
    return best;
  }

  function startDrag(index: number, event: PointerEvent, jump: boolean): void {
    dragging = index;
    handles[index].classList.add('dragging');
    handles[index].focus();
    area.setPointerCapture(event.pointerId);
    if (jump) setValue(index, valueAt(event.clientX));
  }

  function stopDrag(): void {
    if (dragging < 0) return;
    handles[dragging].classList.remove('dragging');
    dragging = -1;
  }

  area.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const hit = event.target instanceof Element ? event.target.closest('.track-thumb') : null;
    const onThumb = hit instanceof HTMLElement;
    const index = onThumb ? handles.indexOf(hit) : nearestIndex(event.clientX);
    if (index < 0) return;
    event.preventDefault();
    startDrag(index, event, !onThumb);
  });

  area.addEventListener('pointermove', (event) => {
    if (dragging >= 0) setValue(dragging, valueAt(event.clientX));
  });

  area.addEventListener('pointerup', stopDrag);
  area.addEventListener('pointercancel', stopDrag);

  thumbs.forEach((thumb, index) => {
    const handle = h('div', 'track-thumb');
    const tip = h('span', 'track-tip');
    if (thumb.label) tip.appendChild(h('span', 'track-tip-label', thumb.label));
    const tipValue = h('span', 'track-tip-value');
    tipValue.style.minWidth = `${valueWidth}ch`;
    tip.appendChild(tipValue);
    if (unit) tip.appendChild(h('span', 'track-tip-unit', unit));
    handle.append(h('span', 'track-dot'), tip);
    handle.tabIndex = 0;
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-label', thumb.label || '数值');
    handle.setAttribute('aria-valuemin', String(spec.min));
    handle.setAttribute('aria-valuemax', String(spec.max));

    handle.addEventListener('keydown', (event) => {
      const big = spec.step * 10;
      if (event.key === 'Home') setValue(index, spec.min);
      else if (event.key === 'End') setValue(index, spec.max);
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        setValue(index, values[index] - spec.step);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        setValue(index, values[index] + spec.step);
      } else if (event.key === 'PageDown') setValue(index, values[index] - big);
      else if (event.key === 'PageUp') setValue(index, values[index] + big);
      else return;
      event.preventDefault();
    });

    handles.push(handle);
    tipValues.push(tipValue);
    rail.appendChild(handle);
  });

  thumbs.forEach((_, index) => paint(index));
  return root;
}

/** 单值滑块：轨道上一个圆点，读数只在悬浮或拖动时出现 */
export function slider(
  value: number,
  spec: SliderSpec,
  onChange: (v: number) => void,
): HTMLElement {
  return createTrack([{ label: '', value }], spec, (_index, next) => onChange(next));
}

/** 单轨多滑块：几个档位共用一条轨道，圆点之间互不越过 */
export function rangeTrack(
  thumbs: ReadonlyArray<TrackThumb>,
  spec: SliderSpec,
  onChange: (index: number, value: number) => void,
): HTMLElement {
  return createTrack(thumbs, spec, onChange);
}

/** 单选按钮组，自行维护高亮状态 */
export function segGroup<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
  onChange: (v: T) => void,
): HTMLElement {
  const root = h('div', 'seg');
  const buttons: HTMLButtonElement[] = [];
  for (const opt of options) {
    const btn = h('button', 'seg-btn', opt.label);
    btn.type = 'button';
    btn.dataset.value = opt.value;
    btn.addEventListener('click', () => {
      for (const b of buttons) b.classList.toggle('active', b === btn);
      onChange(opt.value);
    });
    buttons.push(btn);
    root.appendChild(btn);
  }
  sync();
  return root;

  function sync(): void {
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.value === value));
  }
}

/** 多选按钮组，至少保留一项 */
export function multiGroup<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  values: T[],
  onChange: (values: T[]) => void,
): HTMLElement {
  const root = h('div', 'seg');
  const selected = new Set(values);
  for (const opt of options) {
    const btn = h('button', 'seg-btn', opt.label);
    btn.type = 'button';
    btn.classList.toggle('active', selected.has(opt.value));
    btn.addEventListener('click', () => {
      if (selected.has(opt.value)) {
        if (selected.size === 1) return;
        selected.delete(opt.value);
      } else {
        selected.add(opt.value);
      }
      btn.classList.toggle('active', selected.has(opt.value));
      onChange(options.filter((o) => selected.has(o.value)).map((o) => o.value));
    });
    root.appendChild(btn);
  }
  return root;
}

/** 按钮 */
export function button(
  label: string,
  kind: 'primary' | 'ghost' | 'danger',
  onClick: () => void,
): HTMLButtonElement {
  const btn = h('button', `btn ${kind}`, label);
  btn.type = 'button';
  btn.addEventListener('click', onClick);
  return btn;
}

/** 操作行 */
export function actions(...children: HTMLElement[]): HTMLElement {
  const root = h('div', 'actions');
  root.append(...children);
  return root;
}
