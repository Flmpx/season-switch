/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 元素表单：新建页与详情页共用的字段编辑器。
// 表单状态（UserElement 草稿）在内部持有，每次修改都通过 onChange 通知外部重绘预览。
// 所有数值字段统一用滑块（范围来自 NUMERIC_LIMITS），拖动就不可能产生越界值。
import {
  NUMERIC_LIMITS,
  type ElementBehavior,
  type ElementRender,
  type NumericLimit,
  type Season,
} from '../envir/particle/elements';
import type { UserElement } from '../../lib/element-store';
import { getAsset, putAsset } from '../../lib/asset-store';
import { importSvg } from './svg-import';
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
  presetSliders,
  row,
  segGroup,
  slider,
  subTitle,
  type SliderSpec,
} from './fields';

export type RenderKind = ElementRender['kind'];

export interface ElementFormOptions {
  /** 内置元素：外观（render）只读，其余字段可改 */
  lockedRender?: boolean;
  onChange?: (state: UserElement) => void;
}

export interface ElementForm {
  root: HTMLElement;
  read(): UserElement;
}

const SEASON_OPTIONS: ReadonlyArray<{ value: Season; label: string }> = [
  { value: 'spring', label: '春' },
  { value: 'summer', label: '夏' },
  { value: 'autumn', label: '秋' },
  { value: 'winter', label: '冬' },
];

const RENDER_OPTIONS: ReadonlyArray<{ value: RenderKind; label: string }> = [
  { value: 'svg', label: 'SVG' },
  { value: 'image', label: '图片' },
  { value: 'emoji', label: 'emoji' },
  { value: 'text', label: '文字' },
];

const EMOJI_PRESETS = ['✨', '🌟', '❄️', '🍂', '🍁', '🌸', '🍃', '🦋', '💫', '🌙', '☀️', '🫧'];

const FONT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "'Microsoft YaHei', sans-serif", label: '雅黑' },
  { value: 'SimSun, serif', label: '宋体' },
  { value: 'KaiTi, serif', label: '楷体' },
  { value: 'serif', label: '衬线' },
  { value: 'sans-serif', label: '无衬线' },
];

/* 区间 + 单位 → 滑块参数 */
function specOf(limit: NumericLimit, unit?: string): SliderSpec {
  return { min: limit.min, max: limit.max, step: limit.step, unit };
}

/* 数量的合法区间随行为变化：飘落按个/分钟，闪烁按峰值颗数 */
function countLimitOf(behavior: ElementBehavior): NumericLimit {
  return behavior === 'twinkle' ? NUMERIC_LIMITS.countTwinkle : NUMERIC_LIMITS.countFall;
}

/* 新建元素的初始草稿 */
export function defaultElement(): UserElement {
  return {
    id: 'draft',
    label: '新粒子',
    icon: '✨',
    behavior: 'fall',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    render: { kind: 'emoji', glyph: '✨' },
    color: '#ffffff',
    speedPresets: [14, 28, 50],
    sizePresets: [4, 8, 14],
    countPresets: [10, 20, 50, 120],
    motion: {
      jitter: 0.4,
      wobbleSpeed: 1.4,
      wobbleAmp: 20,
      rotationSpeed: 0.8,
      opacity: 0.9,
      twinkleSpeed: 0,
    },
    target: { region: 'top-third', visibleFrom: 19, visibleTo: 5 },
    defaults: { speed: 28, size: 8, count: 20 },
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

/* 读取图片宽高比（宽/高） */
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

/* 构建元素表单 */
export function createElementForm(
  initial: UserElement,
  options: ElementFormOptions = {},
): ElementForm {
  const state: UserElement = structuredClone(initial);
  const root = document.createElement('div');
  root.className = 'form';

  const notify = (): void => options.onChange?.(state);

  /* ---------- 基础 ---------- */
  const basics = group('基础', true);
  basics.body.append(
    row('名称', inputText(state.label, (v) => {
      state.label = v;
      notify();
    }, '例如：银杏叶')),
    row('图标', inputText(state.icon, (v) => {
      state.icon = v.slice(0, 4);
      notify();
    }, '列表里显示的 emoji')),
    row(
      '行为',
      segGroup<ElementBehavior>(
        [
          { value: 'fall', label: '飘落' },
          { value: 'twinkle', label: '闪烁' },
        ],
        state.behavior,
        (v) => {
          setBehavior(v);
          notify();
          renderAppear();
          renderPresets();
        },
      ),
      state.behavior === 'twinkle' ? '在固定区域内明暗闪烁' : '从上方持续飘落',
    ),
  );
  root.appendChild(basics.root);

  function setBehavior(v: ElementBehavior): void {
    state.behavior = v;
    if (v === 'twinkle') {
      if (!state.target) {
        state.target = { region: 'top-third', visibleFrom: 19, visibleTo: 5 };
      }
      if (!state.motion.twinkleSpeed) state.motion.twinkleSpeed = 1.9;
    }
  }

  /* ---------- 外观 ---------- */
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

  /* SVG 外观：文件导入或粘贴代码，导入后立即写入 paths */
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

  /* 图片外观：读成 dataURL 存进资产库，渲染时按 assetId 取图 */
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
          renderAppearance(); // 宽高比滑块要显示真实值
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

  /* emoji 外观：预设格子 + 手输入 */
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

  /* 文字外观：内容 + 字体 + 字重 + 颜色 */
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

  /* ---------- 出现 ---------- */
  const appear = group('出现', true);
  root.appendChild(appear.root);

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
      return;
    }

    const target = state.target ?? { region: 'top-third', visibleFrom: 19, visibleTo: 5 };
    state.target = target;

    appear.body.append(
      row('出现区域', segGroup(
        [
          { value: 'top-third', label: '上三分之一' },
          { value: 'full', label: '全屏' },
        ],
        target.region,
        (v) => {
          target.region = v;
          notify();
        },
      )),
      row('出现时间', slider(target.visibleFrom, specOf(NUMERIC_LIMITS.hour, ' 点'), (v) => {
        target.visibleFrom = v;
        notify();
      })),
      row('消失时间', slider(target.visibleTo, specOf(NUMERIC_LIMITS.hour, ' 点'), (v) => {
        target.visibleTo = v;
        notify();
      }), '可跨午夜，例如 19 点出现、次日 5 点消失'),
    );
  }

  /* ---------- 运动 ---------- */
  const motion = group('运动', false);
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
    row('闪烁频率', slider(state.motion.twinkleSpeed, specOf(NUMERIC_LIMITS.twinkleSpeed), (v) => {
      state.motion.twinkleSpeed = v;
      notify();
    }), '仅闪烁元素使用'),
  );
  root.appendChild(motion.root);

  /* ---------- 档位与默认值 ---------- */
  const presets = group('档位与默认值', false);
  root.appendChild(presets.root);

  function presetItem(
    arr: number[],
    index: number,
    label: string,
    fallback: number,
  ): { label: string; value: number; onChange: (v: number) => void } {
    while (arr.length <= index) arr.push(fallback);
    return {
      label,
      value: arr[index],
      onChange: (v) => {
        arr[index] = v;
        notify();
      },
    };
  }

  function renderPresets(): void {
    presets.body.replaceChildren();

    const countLimit = countLimitOf(state.behavior);
    const speedNote =
      state.behavior === 'twinkle' ? '（闪烁元素不使用速度档位，留作切回飘落时使用）' : '（px/s）';

    presets.body.append(
      subTitle(`速度档位${speedNote}`),
      presetSliders([
        presetItem(state.speedPresets, 0, '慢', 14),
        presetItem(state.speedPresets, 1, '中', 28),
        presetItem(state.speedPresets, 2, '快', 50),
      ], specOf(NUMERIC_LIMITS.speed)),
      subTitle('大小档位（px）'),
      presetSliders([
        presetItem(state.sizePresets, 0, '小', 4),
        presetItem(state.sizePresets, 1, '中', 8),
        presetItem(state.sizePresets, 2, '大', 14),
      ], specOf(NUMERIC_LIMITS.size)),
      subTitle(
        state.behavior === 'twinkle'
          ? '数目档位（闪烁：峰值颗数）'
          : '数目档位（飘落：个/分钟）',
      ),
      presetSliders([
        presetItem(state.countPresets, 0, '微量', 10),
        presetItem(state.countPresets, 1, '少量', 20),
        presetItem(state.countPresets, 2, '中等', 50),
        presetItem(state.countPresets, 3, '大量', 120),
      ], specOf(countLimit)),
      subTitle('默认当前值'),
      row('速度', slider(state.defaults.speed, specOf(NUMERIC_LIMITS.speed, ' px/s'), (v) => {
        state.defaults.speed = v;
        notify();
      })),
      row('大小', slider(state.defaults.size, specOf(NUMERIC_LIMITS.size, ' px'), (v) => {
        state.defaults.size = v;
        notify();
      })),
      row('数目', slider(state.defaults.count, specOf(countLimit), (v) => {
        state.defaults.count = v;
        notify();
      }), state.behavior === 'twinkle' ? '午夜峰值颗数' : '个/分钟'),
    );
  }

  renderAppearance();
  renderAppear();
  renderPresets();

  return {
    root,
    read: () => state,
  };
}
