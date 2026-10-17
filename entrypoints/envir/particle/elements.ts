/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 元素描述符契约：内置元素来自 elements.json，用户元素来自 lib/element-store，
// 运行期由 registry 合并成一张表。render 支持四种外观（svg / image / emoji / text）。
import elementsData from './elements.json';
import type { SeasonWeights } from '../../../lib/season-weights';

/** 季节 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** 元素行为：fall=飘落，twinkle=闪烁 */
export type ElementBehavior = 'fall' | 'twinkle';

/** 元素来源：内置（elements.json）或用户创建 */
export type ElementSource = 'builtin' | 'user';

/** SVG 路径填充：纯色（可取粒子色或常量色）或径向渐变 */
export type PathFill =
  | { mode: 'solid'; source: 'particle' | 'constant'; color?: string }
  | { mode: 'radial'; stops: { offset: number; color: string }[] };

/** 单条 SVG 路径 */
export interface PathSpec {
  d: string; // SVG path 数据（已归一化到 [-1,1]）
  fill: PathFill | null; // 填充
  stroke: { color: string; widthPx: number } | null; // 描边（像素宽）
}

/** SVG 外观：一组路径 */
export interface SvgRender {
  kind: 'svg';
  paths: PathSpec[];
}

/** 图片外观：引用资产库中的 assetId（aspect = 宽/高） */
export interface ImageRender {
  kind: 'image';
  assetId: string;
  aspect: number;
}

/** emoji 外观：一个字形 */
export interface EmojiRender {
  kind: 'emoji';
  glyph: string;
}

/** 文字外观：字符串 + 字体 */
export interface TextRender {
  kind: 'text';
  text: string;
  fontFamily: string;
  fontWeight: number;
  color: string;
}

/** 元素外观（四种来源） */
export type ElementRender = SvgRender | ImageRender | EmojiRender | TextRender;

/** 运动参数：单值 + 抖动（各粒子在该值 ±jitter 内随机） */
export interface MotionSpec {
  jitter: number; // 0-1，速度/尺寸/不透明度在该比例内随机
  wobbleSpeed: number; // 摆动频率
  wobbleAmp: number; // 摆幅（像素）
  rotationSpeed: number; // 旋转速度（弧度/秒）
  opacity: number; // 基础不透明度 0-1
  twinkleSpeed: number; // 闪烁频率（twinkle 用；fall 恒 0）
}

/** twinkle 出现规则 */
export interface TargetSpec {
  region: 'top-third' | 'full'; // 出现区域
  visibleFrom: number; // 起始小时 0-23
  visibleTo: number; // 结束小时（可跨午夜）
}

/** 元素出厂当前值（"中/中等"档位） */
export interface ParticleDefaults {
  speed: number; // px/s
  size: number; // px
  count: number; // fall：个/分钟；twinkle：午夜峰值颗数
}

/** 元素描述符（elements.json 与用户库统一契约） */
export interface ElementDescriptor {
  id: string; // 元素唯一键（内置：leaf/snow/star；用户：u_xxxxxxxx）
  source: ElementSource; // 来源
  label: string; // 显示名（中文）
  icon: string; // 显示图标（emoji）
  behavior: ElementBehavior; // fall / twinkle
  seasons: Season[]; // fall：出现季节（仅决定是否出现；leaf 额外用于取色）
  render: ElementRender; // 外观
  color?: string; // 固定色（无 palettes 时使用）
  palettes?: Partial<Record<Season, string[]>>; // 按季节色板（仅内置 leaf）
  speedPresets: number[]; // 慢/中/快 → px/s（twinkle 可为空）
  sizePresets: number[]; // 小/中/大 → px
  countPresets: number[]; // 微量/少量/中等/大量
  motion: MotionSpec; // 运动参数
  target?: TargetSpec; // twinkle 出现规则
  defaults: ParticleDefaults; // 出厂当前值
}

/** 内置元素（elements.json 内一条；id/source 由 registry 注入） */
export type BuiltinElement = Omit<ElementDescriptor, 'id' | 'source'>;

/** 内置元素表（键序即内置顺序） */
export const BUILTIN_ELEMENTS = elementsData as unknown as Record<string, BuiltinElement>;

/* fall 元素在给定季节权重下的出现权重（其 seasons 各季权重之和） */
export function seasonWeightFor(
  desc: Pick<ElementDescriptor, 'seasons'>,
  weights: SeasonWeights,
): number {
  return desc.seasons.reduce((sum, s) => sum + (weights[s] ?? 0), 0);
}
