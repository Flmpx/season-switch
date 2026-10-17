/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 元素描述符：elements.json 的类型与访问器，新增元素只改 JSON 即可
import elementsData from './elements.json';
import type { SeasonWeights } from '../../../lib/season-weights';

/** 元素行为：fall=飘落，twinkle=闪烁 */
export type ElementBehavior = 'fall' | 'twinkle';

/** 数值区间 */
export interface Range {
  min: number; // 下界
  max: number; // 上界
}

/** 元素描述符（与 elements.json 对齐；render 仅取生成所需的字段） */
export interface ElementDescriptor {
  behavior: ElementBehavior; // fall / twinkle
  label?: string; // 弹窗显示名（中文）
  icon?: string; // 弹窗显示图标（emoji）
  seasons?: string[]; // fall 元素：哪些季节使其出现（并按权重从中取色）
  palettes?: Record<string, string[]>; // 按季节色板（有则按季节权重取色）
  color?: string; // 固定颜色（无 palettes 时使用）
  sizeRange: Range; // 尺寸范围（像素，未乘缩放）
  speedRange?: Range; // 下落速度范围（fall 用；twinkle 恒 0）
  wobbleSpeedRange?: Range; // 摆动频率范围
  wobbleAmpRange?: Range; // 摆幅范围
  rotationSpeedRange?: Range; // 旋转速度范围
  opacityRange?: Range; // 初始不透明度范围
  twinkleSpeedRange?: Range; // 闪烁频率范围（twinkle 用）
  target?: {
    max: number; // 午夜（峰值）最大数量
    region: string; // 出现区域，'top-third' 表示屏幕上方 1/3
    visibleFrom: number; // 出现时段起点（小时，0-23，可跨午夜）
    visibleTo: number; // 出现时段终点（小时）
  };
  render: {
    type: 'svg' | 'emoji'; // 渲染方式
    paths?: { d: string; fill: unknown; stroke: unknown }[]; // SVG 路径
    glyph?: string; // emoji 字形
  };
}

const ELEMENTS = elementsData as unknown as Record<string, ElementDescriptor>;

/** 当前支持的全部元素类型（取自 elements.json 的键顺序） */
export const ELEMENT_TYPES = Object.keys(ELEMENTS);

/* 按类型取元素描述符 */
export function getElementDescriptor(type: string): ElementDescriptor | undefined {
  return ELEMENTS[type];
}

/* 弹窗展示用元信息（label / icon） */
export function getElementMeta(type: string): { label: string; icon: string } {
  const d = ELEMENTS[type];
  return { label: d?.label ?? type, icon: d?.icon ?? '•' };
}

/* fall 元素在给定季节权重下的出现权重（其 seasons 各季权重之和） */
export function seasonWeightFor(desc: ElementDescriptor, weights: SeasonWeights): number {
  const seasons = desc.seasons ?? [];
  return seasons.reduce(
    (sum, s) => sum + (weights[s as keyof SeasonWeights] ?? 0),
    0,
  );
}
