/**
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/**
 * 元素表单：新建页与详情页共用的字段编辑器
 * 草稿在内部持有，每次修改经 onChange 通知外部重绘预览
 * 数值字段统一用滑块，拖动不会产生越界值
 */
import {
  NUMERIC_LIMITS,
  type ElementBehavior,
  type ElementRender,
  type NumericLimit,
  type Season,
  type VisibleWindow,
} from '../envir/particle/elements';
import type { UserElement } from '../../lib/element-store';
import { getAsset, putAsset } from '../../lib/asset-store';
import { importSvg } from './svg-import';
import { openRegionModal } from './region-modal';
import {
  actions,
  button,
  colorPicker,
  group,
  h,
  hint,
  inputArea,
  inputText,
  multiGroup,
  rangeTrack,
  row,
  segGroup,
  slider,
  subTitle,
  type SliderSpec,
} from './fields';

/* 外观类型 */
export type RenderKind = ElementRender['kind'];

/* 元素表单选项 */
export interface ElementFormOptions {
  lockedRender?: boolean; // 内置元素外观只读
  lockedBasics?: boolean; // 内置元素基础信息只读
  onChange?: (state: UserElement) => void; // 状态变更回调
}

/* 元素表单实例 */
export interface ElementForm {
  root: HTMLElement; // 根节点
  read(): UserElement; // 读取当前草稿
}

/* 季节选项 */
const SEASON_OPTIONS: ReadonlyArray<{ value: Season; label: string }> = [
  { value: 'spring', label: '春' },
  { value: 'summer', label: '夏' },
  { value: 'autumn', label: '秋' },
  { value: 'winter', label: '冬' },
];

/* 外观类型选项 */
const RENDER_OPTIONS: ReadonlyArray<{ value: RenderKind; label: string }> = [
  { value: 'svg', label: 'SVG' },
  { value: 'image', label: '图片' },
  { value: 'emoji', label: 'emoji' },
  { value: 'text', label: '文字' },
];

/* 预设 emoji 字形 */
const EMOJI_PRESETS = ['✨', '🌟', '❄️', '🍂', '🍁', '🌸', '🍃', '🦋', '💫', '🌙', '☀️', '🫧'];

/* 字体选项 */
const FONT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "'Microsoft YaHei', sans-serif", label: '雅黑' },
  { value: 'SimSun, serif', label: '宋体' },
  { value: 'KaiTi, serif', label: '楷体' },
  { value: 'serif', label: '衬线' },
  { value: 'sans-serif', label: '无衬线' },
];

/* 区间和单位转成滑块参数 */
function specOf(limit: NumericLimit, unit?: string): SliderSpec {
  return { min: limit.min, max: limit.max, step: limit.step, unit };
}

/* 按行为取数量区间：飘落按个/分钟，闪烁按峰值 */
function countLimitOf(behavior: ElementBehavior): NumericLimit {
  return behavior === 'twinkle' ? NUMERIC_LIMITS.countTwinkle : NUMERIC_LIMITS.countFall;
}

/* 归一化出现时段：不跨午夜时要求 from ≤ to，跨午夜时要求 from > to，不满足就交换 */
function normalizeVisible(visible: VisibleWindow): void {
  const inverted = visible.wrap ? visible.from < visible.to : visible.from > visible.to;
  if (!inverted) return;
  const from = visible.from;
  visible.from = visible.to;
  visible.to = from;
}

/* 新建元素的初始草稿 */
export function defaultElement(): UserElement {
  return {
    id: 'draft',
    label: '新粒子',
    icon: 'sparkle',
    behavior: 'fall',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    render: { kind: 'emoji', glyph: '✨' },
    color: '#ffffff',
    presets: {
      speed: [14, 28, 50],
      size: [4, 8, 14],
      count: [10, 20, 50, 120],
    },
    motion: {
      jitter: 0.4,
      wobbleSpeed: 1.4,
      wobbleAmp: 20,
      rotationSpeed: 0.8,
      opacity: 0.9,
      twinkleSpeed: 0,
    },
    region: { x: 0, y: 0, w: 1, h: 1 },
    visible: { from: 0, to: 24, wrap: false },
  };
}

/* 切换外观类型时的初始外观 */
function emptyRender(kind: RenderKind, state: UserElement): ElementRender {
  if (kind === 'svg') return { kind: 'svg', paths: [] };
  if (kind === 'image') return { kind: 'image', assetId: '', aspect: 1 };
  if (kind === 'emoji') return { kind: 'emoji', glyph: state.icon || '✨' };
  return {
    kind: 'text',
    text: state.label || '粒子',
    fontFamily: FONT_OPTIONS[0].value,
    fontWeight: 600,
    color: '#ffffff',
  };
}

/* 外观类型的中文名 */
export function renderKindLabel(kind: RenderKind): string {
  const hit = RENDER_OPTIONS.find((o) => o.value === kind);
  return hit ? hit.label : kind;
}

/* 读取图片宽高比，即宽除以高 */
async function measureAspect(blob: Blob): Promise<number> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img.naturalWidth / Math.max(1, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * 构建元素表单
 * SVG 与图片导入后立即写入草稿
 * 导入图片后重渲染，让宽高比滑块显示真实值
 */
export function createElementForm(
  initial: UserElement,
  options: ElementFormOptions = {},
): ElementForm {
  const state: UserElement = structuredClone(initial);
  normalizeVisible(state.visible);
  const root = document.createElement('div');
  root.className = 'form';

  const notify = (): void => options.onChange?.(state);

  const basics = group('基础', true);
  root.appendChild(basics.root);

  /* 行为一行的悬浮说明，随当前行为变化 */
  function behaviorTip(behavior: ElementBehavior): string {
    return behavior === 'twinkle' ? '在固定区域内明暗闪烁' : '从上方持续飘落';
  }

  function renderBasics(): void {
    basics.body.replaceChildren();

    if (options.lockedBasics) {
      basics.body.appendChild(
        hint('内置元素的基础信息（名称、图标、行为）不可修改，仅可调整下方参数'),
      );
      return;
    }

    const behaviorRow = row(
      '行为',
      segGroup<ElementBehavior>(
        [
          { value: 'fall', label: '飘落' },
          { value: 'twinkle', label: '闪烁' },
        ],
        state.behavior,
        (v) => {
          setBehavior(v);
          if (tipEl) tipEl.dataset.tip = behaviorTip(v);
          notify();
          renderAppear();
          renderMotion();
          renderPresets();
        },
      ),
      behaviorTip(state.behavior),
    );

    const tipEl = behaviorRow.querySelector<HTMLElement>('.field-label');

    basics.body.append(
      row('名称', inputText(state.label, (v) => {
        state.label = v;
        notify();
      }, '例如：银杏叶')),
      row('图标', inputText(state.icon, (v) => {
        state.icon = v.trim().slice(0, 12);
        notify();
      }, '图标名（如 leaf、snow）或一个字符')),
      behaviorRow,
    );
  }

  renderBasics();

  function setBehavior(v: ElementBehavior): void {
    state.behavior = v;
    if (v === 'twinkle' && !state.motion.twinkleSpeed) state.motion.twinkleSpeed = 1.9;
  }

  const appearance = group('外观', true);
  root.appendChild(appearance.root);

  function renderAppearance(): void {
    appearance.body.replaceChildren();

    if (options.lockedRender) {
      appearance.body.appendChild(
        hint(`内置外观为「${renderKindLabel(state.render.kind)}」，不可修改，仅可调整下方参数`),
      );
      return;
    }

    appearance.body.appendChild(
      segGroup<RenderKind>(RENDER_OPTIONS, state.render.kind, (v) => {
        state.render = emptyRender(v, state);
        notify();
        renderAppearance();
      }),
    );

    const editor = h('div', 'stack');
    if (state.render.kind === 'svg') editor.appendChild(svgEditor());
    else if (state.render.kind === 'image') editor.appendChild(imageEditor());
    else if (state.render.kind === 'emoji') editor.appendChild(emojiEditor());
    else editor.appendChild(textEditor());
    appearance.body.appendChild(editor);
  }

  function svgEditor(): HTMLElement {
    const wrap = h('div', 'stack');
    const status = hint(
      state.render.kind === 'svg' && state.render.paths.length > 0
        ? `当前 ${state.render.paths.length} 条路径`
        : '尚未导入图形',
    );

    const applyText = (text: string): void => {
      if (!text.trim()) {
        status.textContent = '请选择 SVG 文件或粘贴 SVG 代码';
        status.classList.add('error');
        return;
      }
      try {
        const result = importSvg(text);
        state.render = { kind: 'svg', paths: result.paths };
        status.classList.remove('error');
        status.textContent =
          `已导入 ${result.paths.length} 条路径` +
          (result.warnings.length > 0 ? `（${result.warnings.join('，')}）` : '');
        notify();
      } catch (err) {
        status.classList.add('error');
        status.textContent = `导入失败：${err instanceof Error ? err.message : String(err)}`;
      }
    };

    const file = h('input', 'file');
    file.type = 'file';
    file.accept = '.svg,image/svg+xml';
    file.addEventListener('change', () => {
      const picked = file.files?.[0];
      if (!picked) return;
      void picked.text().then(applyText);
    });

    const area = inputArea('', 6, () => {});
    area.placeholder = '或把 SVG 代码粘贴到这里';

    wrap.append(file, area, actions(button('解析粘贴的 SVG', 'ghost', () => applyText(area.value))), status);
    return wrap;
  }

  function imageEditor(): HTMLElement {
    const wrap = h('div', 'stack');
    const status = hint('支持 PNG / JPEG / WebP / GIF / SVG，单图上限 512KB');
    const thumb = h('img', 'thumb');

    if (state.render.kind === 'image' && state.render.assetId) {
      void getAsset(state.render.assetId).then((rec) => {
        if (rec) thumb.src = rec.dataUrl;
      });
    }

    const file = h('input', 'file');
    file.type = 'file';
    file.accept = 'image/*';
    file.addEventListener('change', () => {
      const picked = file.files?.[0];
      if (!picked) return;
      void (async () => {
        try {
          const aspect = await measureAspect(picked);
          const rec = await putAsset(picked, picked.type || 'image/png', aspect);
          state.render = { kind: 'image', assetId: rec.id, aspect: rec.aspect };
          thumb.src = rec.dataUrl;
          status.classList.remove('error');
          status.textContent = `已导入 ${Math.round(rec.bytes / 1024)}KB`;
          notify();
          renderAppearance();
        } catch (err) {
          status.classList.add('error');
          status.textContent = err instanceof Error ? err.message : String(err);
        }
      })();
    });

    const aspectRow =
      state.render.kind === 'image'
        ? row(
            '宽高比',
            slider(state.render.aspect, specOf(NUMERIC_LIMITS.aspect), (v) => {
              if (state.render.kind !== 'image') return;
              state.render.aspect = v;
              notify();
            }),
            '宽 / 高，导入图片时自动测量',
          )
        : hint('导入图片后自动测量宽高比');

    wrap.append(file, thumb, aspectRow, status);
    return wrap;
  }

  function emojiEditor(): HTMLElement {
    const wrap = h('div', 'stack');
    if (state.render.kind !== 'emoji') return wrap;

    const input = inputText(state.render.glyph, (v) => {
      if (state.render.kind !== 'emoji') return;
      state.render.glyph = v.slice(0, 4);
      notify();
    }, '输入任意 emoji');

    const grid = h('div', 'emoji-grid');
    for (const glyph of EMOJI_PRESETS) {
      const btn = h('button', 'emoji-btn', glyph);
      btn.type = 'button';
      btn.addEventListener('click', () => {
        if (state.render.kind !== 'emoji') return;
        state.render.glyph = glyph;
        input.value = glyph;
        notify();
      });
      grid.appendChild(btn);
    }

    wrap.append(row('字形', input), grid);
    return wrap;
  }

  function textEditor(): HTMLElement {
    const wrap = h('div', 'stack');
    if (state.render.kind !== 'text') return wrap;
    const render = state.render;

    const select = document.createElement('select');
    select.className = 'input select';
    for (const opt of FONT_OPTIONS) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === render.fontFamily) o.selected = true;
      select.appendChild(o);
    }
    select.addEventListener('change', () => {
      render.fontFamily = select.value;
      notify();
    });

    wrap.append(
      row('文字', inputText(render.text, (v) => {
        render.text = v;
        notify();
      })),
      row('字体', select),
      row('字重', segGroup<'400' | '600' | '700'>(
        [
          { value: '400', label: '常规' },
          { value: '600', label: '半粗' },
          { value: '700', label: '粗体' },
        ],
        String(render.fontWeight) as '400' | '600' | '700',
        (v) => {
          render.fontWeight = Number(v);
          notify();
        },
      )),
      row('颜色', colorPicker(render.color, (v) => {
        render.color = v;
        notify();
      })),
    );
    return wrap;
  }

  const appear = group('出现', true);
  root.appendChild(appear.root);

  /* 把当前区域比例写成一句说明 */
  function regionSummary(): string {
    const { x, y, w, h } = state.region;
    return (
      `左 ${Math.round(x * 100)}% · 上 ${Math.round(y * 100)}%` +
      ` · 宽 ${Math.round(w * 100)}% · 高 ${Math.round(h * 100)}%`
    );
  }

  /* 出现区域：按钮打开遮罩框选，当前比例挂在按钮的悬浮说明里 */
  function regionControl(): HTMLElement {
    const pick = button('框选区域', 'ghost', () => void pickRegion());
    pick.classList.add('has-tip');
    pick.dataset.tip = regionSummary();
    return actions(pick);
  }

  /* 在遮罩上拖动方框选择区域，确认后覆盖当前比例 */
  async function pickRegion(): Promise<void> {
    const region = await openRegionModal(state.region);
    if (!region) return;
    state.region = region;
    renderAppear();
    notify();
  }

  /* 小时数转成「x 点」文本 */
  function formatHour(hour: number): string {
    return `${Number(hour.toFixed(1))} 点`;
  }

  /* 用一句话描述当前出现时段，挂在行标签的悬浮说明里 */
  function timeSummary(): string {
    if (!state.visible.wrap && state.visible.from === 0 && state.visible.to === 24) return '全天';
    const from = formatHour(state.visible.from);
    const to = formatHour(state.visible.to);
    return state.visible.wrap ? `${from} 到次日 ${to}` : `${from} 到 ${to}`;
  }

  /* 出现时段：两个圆点共用一条 0-24 轨道，跨午夜时左右含义对调 */
  function timeControl(): HTMLElement {
    const wrap = state.visible.wrap;
    const thumbs = wrap
      ? [
          { label: '消失', value: state.visible.to },
          { label: '出现', value: state.visible.from },
        ]
      : [
          { label: '出现', value: state.visible.from },
          { label: '消失', value: state.visible.to },
        ];

    return rangeTrack(
      thumbs,
      specOf(NUMERIC_LIMITS.hour, ' 点'),
      (index, value) => {
        if (wrap ? index === 1 : index === 0) state.visible.from = value;
        else state.visible.to = value;
        notify();
      },
    );
  }

  function renderAppear(): void {
    appear.body.replaceChildren();

    if (state.behavior === 'fall') {
      appear.body.appendChild(
        row(
          '出现季节',
          multiGroup<Season>(SEASON_OPTIONS, state.seasons, (v) => {
            state.seasons = v;
            notify();
          }),
          '决定该季节是否出现；只有内置叶子会随季节变色',
        ),
      );
    }

    appear.body.append(
      row(
        '出现区域',
        regionControl(),
        '拖动方框选择粒子在页面上的出现范围，方框占整个窗口的比例就是区域比例',
      ),
      subTitle('出现时段'),
      row(
        '时段',
        timeControl(),
        state.visible.wrap
          ? `选「是」时左侧圆点是消失时刻、右侧是出现时刻，时段跨过零点；当前 ${timeSummary()}`
          : `左侧是出现时刻，右侧是消失时刻；当前 ${timeSummary()}`,
      ),
      row(
        '跨午夜',
        segGroup(
          [
            { value: 'no', label: '否' },
            { value: 'yes', label: '是' },
          ],
          state.visible.wrap ? 'yes' : 'no',
          (v) => {
            state.visible.wrap = v === 'yes';
            normalizeVisible(state.visible);
            notify();
            renderAppear();
          },
        ),
        '选「是」后左右两个圆点的含义对调，用于 19 点出现、次日 5 点消失这类时段',
      ),
    );
  }

  const motion = group('运动', false);
  root.appendChild(motion.root);

  /* 运动参数：闪烁频率只在闪烁元素下出现 */
  function renderMotion(): void {
    motion.body.replaceChildren();

    motion.body.append(
      row('随机抖动', slider(state.motion.jitter, specOf(NUMERIC_LIMITS.jitter), (v) => {
        state.motion.jitter = v;
        notify();
      }), '速度/大小/不透明度在该比例内随机'),
      row('摆动频率', slider(state.motion.wobbleSpeed, specOf(NUMERIC_LIMITS.wobbleSpeed), (v) => {
        state.motion.wobbleSpeed = v;
        notify();
      }), '越大摆动越快'),
      row('摆幅', slider(state.motion.wobbleAmp, specOf(NUMERIC_LIMITS.wobbleAmp, ' px'), (v) => {
        state.motion.wobbleAmp = v;
        notify();
      })),
      row('旋转速度', slider(state.motion.rotationSpeed, specOf(NUMERIC_LIMITS.rotationSpeed, ' 弧度/秒'), (v) => {
        state.motion.rotationSpeed = v;
        notify();
      }), '负值反向旋转，0 为不旋转'),
      row('不透明度', slider(state.motion.opacity, specOf(NUMERIC_LIMITS.opacity), (v) => {
        state.motion.opacity = v;
        notify();
      })),
    );

    if (state.behavior === 'twinkle') {
      motion.body.appendChild(
        row('闪烁频率', slider(state.motion.twinkleSpeed, specOf(NUMERIC_LIMITS.twinkleSpeed), (v) => {
          state.motion.twinkleSpeed = v;
          notify();
        }), '明暗交替的快慢'),
      );
    }
  }

  const presets = group('档位', false);
  root.appendChild(presets.root);

  /* 取档位数组里的第 index 项，缺项用默认值补齐 */
  function slot(values: number[], index: number, fallback: number): number {
    while (values.length <= index) values.push(fallback);
    return values[index];
  }

  /* 一条轨道放全部档位，拖动后写回档位数组 */
  function presetTrack(
    labels: string[],
    values: number[],
    fallbacks: number[],
    spec: SliderSpec,
  ): HTMLElement {
    const thumbs = labels.map((label, index) => ({
      label,
      value: slot(values, index, fallbacks[index]),
    }));
    return rangeTrack(thumbs, spec, (index, value) => {
      values[index] = value;
      notify();
    });
  }

  function renderPresets(): void {
    presets.body.replaceChildren();

    const countLimit = countLimitOf(state.behavior);
    const speedNote =
      state.behavior === 'twinkle' ? '（闪烁元素不使用速度档位，留作切回飘落时使用）' : '（px/s）';

    presets.body.append(
      subTitle(`速度档位${speedNote}`),
      presetTrack(['慢', '中', '快'], state.presets.speed, [14, 28, 50], specOf(NUMERIC_LIMITS.speed)),
      subTitle('大小档位（px）'),
      presetTrack(['小', '中', '大'], state.presets.size, [4, 8, 14], specOf(NUMERIC_LIMITS.size)),
      subTitle(
        state.behavior === 'twinkle'
          ? '数目档位（闪烁：峰值颗数）'
          : '数目档位（飘落：个/分钟）',
      ),
      presetTrack(['微量', '少量', '中等', '大量'], state.presets.count, [10, 20, 50, 120], specOf(countLimit)),
      hint('弹窗里按这里的档位选择，选哪一档就用哪一档的值'),
    );
  }

  renderAppearance();
  renderAppear();
  renderMotion();
  renderPresets();

  return {
    root,
    read: () => state,
  };
}
