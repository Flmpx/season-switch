// 📑 元素描述符 — elements.json 的类型与访问器
// 把"哪些元素是啥样、怎么生成、何时出现"全部收归数据契约。
// 新增元素只需在 elements.json 加一条目，运行期与弹窗均自动识别，无需任何 TS 改动。

import elementsData from './elements.json';
import type { SeasonWeights } from '../../../lib/season-weights';

export type ElementBehavior = 'fall' | 'twinkle';

export interface Range {
  min: number;
  max: number;
}

// 元素描述符（与 elements.json 对齐；render 仅取生成所需的字段）
export interface ElementDescriptor {
  behavior: ElementBehavior;
  label?: string; // 弹窗显示名（中文）
  icon?: string; // 弹窗显示图标（emoji）
  seasons?: string[]; // fall 元素：哪些季节会使其出现（并按权重从中取色）；缺省为空
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
    type: 'svg' | 'emoji';
    paths?: { d: string; fill: unknown; stroke: unknown }[];
    glyph?: string;
  };
}

const ELEMENTS = elementsData as unknown as Record<string, ElementDescriptor>;

// 当前支持的全部元素类型（取自 elements.json 的键顺序）
export const ELEMENT_TYPES = Object.keys(ELEMENTS);

export function getElementDescriptor(type: string): ElementDescriptor | undefined {
  return ELEMENTS[type];
}

// 弹窗展示用元信息
export function getElementMeta(type: string): { label: string; icon: string } {
  const d = ELEMENTS[type];
  return { label: d?.label ?? type, icon: d?.icon ?? '•' };
}

// 计算某个 fall 元素在给定季节权重下的"出现权重"
// = 其 seasons 列表里各季节权重之和（叶子=春+夏+秋，雪花=冬）
export function seasonWeightFor(desc: ElementDescriptor, weights: SeasonWeights): number {
  const seasons = desc.seasons ?? [];
  return seasons.reduce(
    (sum, s) => sum + (weights[s as keyof SeasonWeights] ?? 0),
    0,
  );
}
