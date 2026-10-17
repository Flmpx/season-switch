/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// SVG 导入：把 SVG 文件解析成「路径 + 仿射矩阵」。
// 不重写路径数据（d 保留源坐标），而是给每条路径附一个矩阵，交由渲染器用 canvas transform 应用。
// 这样弧线（A 命令）、椭圆、旋转等无需数值近似，也不会因重写引入精度误差。
import type { PathFill, PathSpec } from '../envir/particle/elements';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SHAPE_SELECTOR = 'path, rect, circle, ellipse, line, polyline, polygon';

export interface SvgImportResult {
  paths: PathSpec[];
  warnings: string[];
}

/* 读取元素上的数值属性（非法或缺省时用 fallback） */
function num(el: Element, name: string, fallback = 0): number {
  const v = parseFloat(el.getAttribute(name) ?? '');
  return Number.isFinite(v) ? v : fallback;
}

/* 把非 path 形状转成 path 数据；保留圆弧命令，不做贝塞尔近似 */
function shapeToPath(el: Element): string | null {
  const tag = el.tagName.toLowerCase();

  if (tag === 'path') {
    return el.getAttribute('d');
  }

  if (tag === 'rect') {
    const x = num(el, 'x');
    const y = num(el, 'y');
    const w = num(el, 'width');
    const h = num(el, 'height');
    if (w <= 0 || h <= 0) return null;
    const rx = Math.min(Math.max(0, num(el, 'rx')), w / 2);
    const ry = Math.min(Math.max(0, num(el, 'ry', rx)), h / 2);
    if (rx <= 0 || ry <= 0) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    return [
      `M${x + rx} ${y}`,
      `H${x + w - rx}`,
      `A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}`,
      `V${y + h - ry}`,
      `A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}`,
      `H${x + rx}`,
      `A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}`,
      `V${y + ry}`,
      `A${rx} ${ry} 0 0 1 ${x + rx} ${y}`,
      'Z',
    ].join('');
  }

  if (tag === 'circle' || tag === 'ellipse') {
    const cx = num(el, 'cx');
    const cy = num(el, 'cy');
    const rx = tag === 'circle' ? num(el, 'r') : num(el, 'rx');
    const ry = tag === 'circle' ? num(el, 'r') : num(el, 'ry');
    if (rx <= 0 || ry <= 0) return null;
    return `M${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}Z`;
  }

  if (tag === 'line') {
    return `M${num(el, 'x1')} ${num(el, 'y1')}L${num(el, 'x2')} ${num(el, 'y2')}`;
  }

  const coords = (el.getAttribute('points') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (coords.length < 4) return null;
  let d = `M${coords[0]} ${coords[1]}`;
  for (let i = 2; i + 1 < coords.length; i += 2) d += `L${coords[i]} ${coords[i + 1]}`;
  return tag === 'polygon' ? `${d}Z` : d;
}

/* 解析渐变引用（url(#id)）：取中间 stop 的颜色近似成纯色 */
function resolveGradientColor(root: Element, value: string): string | null {
  const match = /url\(\s*['"]?#([^'")\s]+)/.exec(value);
  if (!match) return null;
  const grad = root.querySelector(`#${CSS.escape(match[1])}`);
  if (!grad) return null;
  const stops = grad.querySelectorAll('stop');
  if (stops.length === 0) return null;
  const mid = stops[Math.floor(stops.length / 2)];
  return mid.getAttribute('stop-color');
}

/* 一条待归一化的路径记录 */
interface RawPath {
  d: string; // 源坐标路径
  m: DOMMatrix; // 源坐标 → 视口坐标
  fill: PathFill | null;
  strokeColor: string | null;
  strokeWidth: number; // 源坐标单位
}

/* 保留 6 位小数，避免存储里出现超长浮点串 */
function round6(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/**
 * 解析 SVG 文本，归一化到渲染用的 [-1,1] 空间。
 * 失败时抛错（错误消息可直接展示给用户）。
 */
export function importSvg(text: string): SvgImportResult {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('SVG 解析失败，请检查文件是否为有效 SVG');
  }
  const source = doc.documentElement;
  if (!source || source.tagName.toLowerCase() !== 'svg') {
    throw new Error('文件根节点不是 <svg>');
  }

  const root = document.importNode(source, true) as unknown as SVGSVGElement;
  // 没有 viewBox 时用宽高补一个，保证 getCTM() 有确定坐标系
  if (!root.getAttribute('viewBox')) {
    const w = parseFloat(root.getAttribute('width') ?? '') || 100;
    const h = parseFloat(root.getAttribute('height') ?? '') || 100;
    root.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  // 统一按 100×100 视口渲染，避免源坐标量级过大带来的精度问题
  root.setAttribute('width', '100');
  root.setAttribute('height', '100');

  const host = document.createElementNS(SVG_NS, 'svg');
  host.setAttribute('width', '100');
  host.setAttribute('height', '100');
  host.setAttribute(
    'style',
    'position:fixed;left:-9999px;top:0;width:100px;height:100px;pointer-events:none',
  );
  host.appendChild(root);
  document.body.appendChild(host);

  try {
    const shapes = Array.from(host.querySelectorAll(SHAPE_SELECTOR));
    const raws: RawPath[] = [];
    const warnings: string[] = [];
    let gradientFlattened = false;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const shape of shapes) {
      const d = shapeToPath(shape);
      if (!d) continue;

      const g = shape as SVGGraphicsElement;
      const ctm = g.getCTM();
      if (!ctm) continue;

      const style = getComputedStyle(g);

      let fill: PathFill | null = null;
      const fillValue = style.fill;
      if (fillValue && fillValue !== 'none' && fillValue !== 'transparent') {
        let color = fillValue;
        if (fillValue.startsWith('url(')) {
          const resolved = resolveGradientColor(root, fillValue);
          gradientFlattened = true;
          color = resolved ?? '#c8c8c8';
        } else if (
          color === 'rgb(0, 0, 0)' &&
          !g.closest('[fill]') &&
          !style.fill.startsWith('url(')
        ) {
          // 源文件没写任何填充色，按规范默认是黑；在深色背景上不可见，按白色处理
          color = '#ffffff';
        }
        fill = { mode: 'solid', source: 'constant', color };
      }

      let strokeColor: string | null = null;
      const strokeValue = style.stroke;
      const strokeWidth = parseFloat(style.strokeWidth) || 0;
      if (strokeValue && strokeValue !== 'none' && strokeWidth > 0) {
        let color = strokeValue;
        if (strokeValue.startsWith('url(')) {
          gradientFlattened = true;
          color = resolveGradientColor(root, strokeValue) ?? '#c8c8c8';
        }
        strokeColor = color;
      }

      if (!fill && !strokeColor) continue;

      let bb: DOMRect;
      try {
        bb = g.getBBox();
      } catch {
        continue;
      }
      // 用四角映射求包围盒（旋转图形的包围盒会略放大，可接受）
      const a = ctm.a;
      const b = ctm.b;
      const c = ctm.c;
      const dd = ctm.d;
      const e = ctm.e;
      const f = ctm.f;
      for (const [px, py] of [
        [bb.x, bb.y],
        [bb.x + bb.width, bb.y],
        [bb.x, bb.y + bb.height],
        [bb.x + bb.width, bb.y + bb.height],
      ]) {
        const tx = a * px + c * py + e;
        const ty = b * px + dd * py + f;
        if (tx < minX) minX = tx;
        if (ty < minY) minY = ty;
        if (tx > maxX) maxX = tx;
        if (ty > maxY) maxY = ty;
      }

      raws.push({
        d,
        m: new DOMMatrix([a, b, c, dd, e, f]),
        fill,
        strokeColor,
        strokeWidth,
      });
    }

    if (raws.length === 0) throw new Error('未找到可导入的图形（支持 path/rect/circle/ellipse/line/polyline/polygon）');
    if (root.querySelector('text')) warnings.push('文本元素未导入，请先转成路径');
    if (gradientFlattened) warnings.push('渐变已简化为纯色');

    const width = maxX - minX;
    const height = maxY - minY;
    if (!(width > 0) || !(height > 0)) throw new Error('图形尺寸为 0，无法导入');

    // 最长边映射到长度 2（即 [-1,1]），并按包围盒中心居中
    const k = 2 / Math.max(width, height);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const paths: PathSpec[] = raws.map((r) => {
      const m = r.m;
      return {
        d: r.d,
        fill: r.fill,
        stroke:
          r.strokeColor === null
            ? null
            : {
                color: r.strokeColor,
                // 换算成「渲染尺寸 20px 时的视觉像素宽」，再夹到合理区间
                widthPx: Math.max(0.6, Math.min(4, r.strokeWidth * k * 20)),
              },
        matrix: [
          round6(k * m.a),
          round6(k * m.b),
          round6(k * m.c),
          round6(k * m.d),
          round6(k * (m.e - cx)),
          round6(k * (m.f - cy)),
        ],
      };
    });

    return { paths, warnings };
  } finally {
    host.remove();
  }
}
