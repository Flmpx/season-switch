/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/* 管理页表单控件工厂：统一暗色样式，控件全部走回调，表单状态由调用方持有 */

/* 创建元素 */
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
  root: HTMLElement;
  body: HTMLElement;
  setOpen(open: boolean): void;
}

const GROUP_ANIM_MS = 260; // 与 style.css 里 .group-panel 的过渡时长保持一致

/*
 * 可折叠分组。
 * 不用 <details>：浏览器不允许过渡它的展开高度，展开是"啪"地跳出来的。
 * 这里改成 div + 高度过渡：展开先测量 scrollHeight，动画结束后设回 auto，
 * 这样后续内容变化（切换行为、导入 SVG）仍能把分组自然撑高。
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
    void panel.offsetHeight; // 强制回流，让高度过渡从 0 起步
    panel.style.height = `${body.scrollHeight}px`;
    timer = window.setTimeout(() => {
      if (opened) panel.style.height = 'auto';
    }, GROUP_ANIM_MS);
  }

  function collapse(): void {
    if (!opened) return;
    opened = false;
    root.classList.remove('open');
    head.setAttribute('aria-expanded', 'false');
    window.clearTimeout(timer);
    panel.style.height = `${body.scrollHeight}px`;
    void panel.offsetHeight; // 从当前具体高度起步，否则 0 会被浏览器合并掉
    panel.style.height = '0px';
  }

  head.addEventListener('click', () => {
    if (opened) collapse();
    else expand();
  });

  if (open) {
    opened = true;
    root.classList.add('open');
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

/* 分组内的小标题 */
export function subTitle(text: string): HTMLElement {
  return h('div', 'sub-title', text);
}

/* 一行：左标签 + 右控件，可选说明 */
export function row(label: string, control: HTMLElement, hint?: string): HTMLElement {
  const root = h('div', 'field');
  root.appendChild(h('span', 'field-label', label));
  root.appendChild(control);
  if (hint) root.appendChild(h('span', 'field-hint', hint));
  return root;
}

/* 说明文字 */
export function hint(text: string): HTMLElement {
  return h('span', 'field-hint', text);
}

/* 单行输入框 */
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

/* 多行输入框 */
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

/* 颜色选择器 */
export function colorPicker(value: string, onChange: (v: string) => void): HTMLInputElement {
  const input = h('input', 'input color');
  input.type = 'color';
  input.value = normalizeColor(value);
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

/* 把常见颜色写法收敛到 #rrggbb（input[type=color] 只接受这种格式） */
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
  min: number;
  max: number;
  step: number;
  unit?: string;
  digits?: number; // 不给就按 step 推断
}

/* 按 step 的小数位推断显示精度 */
function decimalsOf(step: number): number {
  if (step >= 1) return 0;
  const text = String(step);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}

/* 对齐到步长并夹进区间（浏览器滑块已保证范围，这里再兜一层浮点误差） */
function roundToStep(value: number, spec: SliderSpec): number {
  const snapped = spec.min + Math.round((value - spec.min) / spec.step) * spec.step;
  return Math.min(spec.max, Math.max(spec.min, Number(snapped.toFixed(6))));
}

function formatValue(value: number, spec: SliderSpec): string {
  return `${value.toFixed(spec.digits ?? decimalsOf(spec.step))}${spec.unit ?? ''}`;
}

/*
 * 数值滑块 + 实时读数。
 * 所有数值字段统一走它：拖动不可能越界，也就不会有手输的离谱值。
 */
export function slider(
  value: number,
  spec: SliderSpec,
  onChange: (v: number) => void,
): HTMLElement {
  const root = h('div', 'slider');
  const input = h('input', 'range');
  input.type = 'range';
  input.min = String(spec.min);
  input.max = String(spec.max);
  input.step = String(spec.step);
  const initial = roundToStep(value, spec);
  input.value = String(initial);

  const readout = h('span', 'range-value', formatValue(initial, spec));
  input.addEventListener('input', () => {
    const next = roundToStep(parseFloat(input.value), spec);
    readout.textContent = formatValue(next, spec);
    onChange(next);
  });

  root.append(input, readout);
  return root;
}

/* 档位组：每个档位一行「名称 + 滑块」，比并排的小输入框更不容易敲出越界值 */
export function presetSliders(
  items: ReadonlyArray<{ label: string; value: number; onChange: (v: number) => void }>,
  spec: SliderSpec,
): HTMLElement {
  const root = h('div', 'preset-sliders');
  for (const item of items) {
    const line = h('div', 'preset-line');
    line.append(h('span', 'preset-name', item.label), slider(item.value, spec, item.onChange));
    root.appendChild(line);
  }
  return root;
}

/* 单选按钮组（自己维护高亮状态） */
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

/* 多选按钮组：至少保留一项 */
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
        if (selected.size === 1) return; // 不允许清空
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

/* 复选开关：一行「标签 + 开关」 */
export function toggleRow(
  label: string,
  checked: boolean,
  onChange: (v: boolean) => void,
): HTMLElement {
  const root = h('label', 'switch-row');
  const text = h('span', 'field-label', label);
  const input = h('input', 'switch');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  root.append(text, input);
  return root;
}

/* 按钮 */
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

/* 操作行 */
export function actions(...children: HTMLElement[]): HTMLElement {
  const root = h('div', 'actions');
  root.append(...children);
  return root;
}
