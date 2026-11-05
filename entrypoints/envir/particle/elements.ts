/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import elementsData from './elements.json';
import type { SeasonWeights } from '../../../lib/season-weights';

/** 季节 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** 元素行为：fall 飘落，twinkle 闪烁 */
export type ElementBehavior = 'fall' | 'twinkle';

/** 元素来源：内置或用户创建 */
export type ElementSource = 'builtin' | 'user';

/** SVG 路径填充：纯色（可跟随粒子色）或径向渐变 */
export type PathFill =
  | { mode: 'solid'; source: 'particle' | 'constant'; color?: string }
  | { mode: 'radial'; stops: { offset: number; color: string }[] };

/** 单条 SVG 路径 */
export interface PathSpec {
  d: string; // 路径数据（源坐标）
  fill: PathFill | null; // 填充，null 表示不填充
  stroke: { color: string; widthPx: number } | null; // 描边，null 表示不描边
  matrix?: [number, number, number, number, number, number]; // 源坐标到 [-1,1] 的仿射矩阵，导入的 SVG 用
}

/** SVG 外观 */
export interface SvgRender {
  kind: 'svg'; // 外观类型
  paths: PathSpec[]; // 路径集合
}

/** 图片外观 */
export interface ImageRender {
  kind: 'image'; // 外观类型
  assetId: string; // 资产库里的图片 id
  aspect: number; // 宽/高
}

/** emoji 外观 */
export interface EmojiRender {
  kind: 'emoji'; // 外观类型
  glyph: string; // 字形
}

/** 文字外观 */
export interface TextRender {
  kind: 'text'; // 外观类型
  text: string; // 文字内容
  fontFamily: string; // 字体
  fontWeight: number; // 字重
  color: string; // 颜色
}

/** 元素外观（四种来源之一） */
export type ElementRender = SvgRender | ImageRender | EmojiRender | TextRender;

/** 运动参数 */
export interface MotionSpec {
  jitter: number; // 抖动比例 0-1，速度/尺寸/不透明度在该比例内随机
  wobbleSpeed: number; // 摆动频率
  wobbleAmp: number; // 摆幅（像素）
  rotationSpeed: number; // 旋转速度（弧度/秒）
  opacity: number; // 基础不透明度 0-1
  twinkleSpeed: number; // 闪烁频率，仅 twinkle 使用
}

/** 出现区域，相对视口的比例 */
export interface Region {
  x: number; // 左边界 0-1
  y: number; // 上边界 0-1
  w: number; // 宽度 0-1
  h: number; // 高度 0-1
}

/** 出现时段，按小时计 */
export interface VisibleWindow {
  from: number; // 开始小时 0-24
  to: number; // 结束小时 0-24
  wrap: boolean; // 为 true 时出现时段为两点之外，即跨午夜
}

/** 三个轴的档位值 */
export interface AxisPresets {
  speed: number[]; // 速度档位（px/s），闪烁元素可为空
  size: number[]; // 大小档位（px）
  count: number[]; // 数目档位：fall 为个/分钟，twinkle 为颗
}

/** 元素描述符，内置元素与用户元素共用 */
export interface ElementDescriptor {
  id: string; // 唯一键，内置为 leaf/snow/star，用户为 u_xxxxxxxx
  source: ElementSource; // 来源
  label: string; // 显示名
  icon: string; // 列表图标
  behavior: ElementBehavior; // 行为类型
  seasons: Season[]; // 出现季节，叶子额外用于取色
  render: ElementRender; // 外观
  color?: string; // 固定色，无 palettes 时使用
  palettes?: Partial<Record<Season, string[]>>; // 按季节色板，仅内置叶子使用
  presets: AxisPresets; // 三轴档位值，弹窗里按档位选择
  motion: MotionSpec; // 运动参数
  region: Region; // 出现区域，两种行为都使用
  visible: VisibleWindow; // 出现时段，两种行为都使用
}

/** 内置元素的一条定义，id/source 由注册表注入 */
export type BuiltinElement = Omit<ElementDescriptor, 'id' | 'source'>;

export const BUILTIN_ELEMENTS = elementsData as unknown as Record<string, BuiltinElement>; // 内置元素表，键序即展示顺序

/** 飘落元素在当前季节权重下的出现权重 */
export function seasonWeightFor(
  desc: Pick<ElementDescriptor, 'seasons'>,
  weights: SeasonWeights,
): number {
  return desc.seasons.reduce((sum, s) => sum + (weights[s] ?? 0), 0);
}

/** 数值字段的取值范围 */
export interface NumericLimit {
  min: number; // 下限
  max: number; // 上限
  step: number; // 步长
}

/** 拼一个范围对象 */
const limit = (min: number, max: number, step: number): NumericLimit => ({ min, max, step });

export const NUMERIC_LIMITS = { // 全部数值字段的合法区间，UI 滑块与读取层夹取共用
  speed: limit(0, 200, 1), // 速度 px/s
  size: limit(1, 120, 0.5), // 大小 px
  countFall: limit(0, 360, 1), // 飘落数目 个/分钟
  countTwinkle: limit(0, 300, 1), // 闪烁数目 颗
  jitter: limit(0, 1, 0.01), // 抖动比例
  wobbleSpeed: limit(0, 5, 0.1), // 摆动频率
  wobbleAmp: limit(0, 80, 1), // 摆幅 px
  rotationSpeed: limit(-3, 3, 0.05), // 旋转速度，负值反向
  opacity: limit(0, 1, 0.01), // 不透明度
  twinkleSpeed: limit(0, 10, 0.1), // 闪烁频率
  hour: limit(0, 24, 0.5), // 小时，允许半小时
  region: limit(0, 1, 0.01), // 区域比例
  aspect: limit(0.1, 10, 0.1), // 图片宽高比
} as const;

/** 把值夹进区间，非有限值回退到 fallback */
function num(value: unknown, l: NumericLimit, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(l.max, Math.max(l.min, n));
}

/** 夹取档位数组，最多保留 8 档 */
function clampList(values: unknown, l: NumericLimit): number[] {
  if (!Array.isArray(values)) return [];
  return values.slice(0, 8).map((v) => num(v, l, l.min));
}

/** 按步长取整，去掉浮点尾巴 */
function roundStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** 夹取出现区域，宽高至少 0.05，右下边界不越界 */
export function clampRegion(region: Region | undefined): Region {
  const l = NUMERIC_LIMITS.region;
  const w = Math.min(1, Math.max(0.05, num(region?.w, l, 1)));
  const h = Math.min(1, Math.max(0.05, num(region?.h, l, 1)));
  return {
    x: Math.min(num(region?.x, l, 0), 1 - w),
    y: Math.min(num(region?.y, l, 0), 1 - h),
    w,
    h,
  };
}

/** 夹取出现时段，按半小时取整 */
function clampVisible(visible: VisibleWindow | undefined): VisibleWindow {
  const l = NUMERIC_LIMITS.hour;
  return {
    from: roundStep(num(visible?.from, l, 0), l.step),
    to: roundStep(num(visible?.to, l, 24), l.step),
    wrap: visible?.wrap === true,
  };
}

/** 档位中间的档位下标，新建元素默认落在这里 */
export function middlePresetIndex(length: number): number {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.floor(length / 2));
}

/**
 * 夹取描述符里的全部数值字段
 * 导入的 JSON、手改的 elements.json、历史数据都可能带越界值，统一在这里收口
 */
export function clampDescriptor(desc: ElementDescriptor): ElementDescriptor {
  const countLimit =
    desc.behavior === 'twinkle' ? NUMERIC_LIMITS.countTwinkle : NUMERIC_LIMITS.countFall;
  const motion: MotionSpec = desc.motion ?? {
    jitter: 0.4,
    wobbleSpeed: 1.4,
    wobbleAmp: 20,
    rotationSpeed: 0,
    opacity: 0.9,
    twinkleSpeed: 0,
  };
  const presets: AxisPresets = desc.presets ?? { speed: [], size: [], count: [] };
  const render: ElementRender =
    desc.render && desc.render.kind === 'image'
      ? { ...desc.render, aspect: num(desc.render.aspect, NUMERIC_LIMITS.aspect, 1) }
      : desc.render;

  return {
    ...desc,
    render,
    presets: {
      speed: clampList(presets.speed, NUMERIC_LIMITS.speed),
      size: clampList(presets.size, NUMERIC_LIMITS.size),
      count: clampList(presets.count, countLimit),
    },
    motion: {
      jitter: num(motion.jitter, NUMERIC_LIMITS.jitter, 0.4),
      wobbleSpeed: num(motion.wobbleSpeed, NUMERIC_LIMITS.wobbleSpeed, 1.4),
      wobbleAmp: num(motion.wobbleAmp, NUMERIC_LIMITS.wobbleAmp, 20),
      rotationSpeed: num(motion.rotationSpeed, NUMERIC_LIMITS.rotationSpeed, 0),
      opacity: num(motion.opacity, NUMERIC_LIMITS.opacity, 0.9),
      twinkleSpeed: num(motion.twinkleSpeed, NUMERIC_LIMITS.twinkleSpeed, 0),
    },
    region: clampRegion(desc.region),
    visible: clampVisible(desc.visible),
  };
}
