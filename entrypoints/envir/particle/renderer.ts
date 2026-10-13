// 🎨 统一渲染器 — 按 elements.json 的描述符绘制粒子
// 内置元素(leaf/snow/star)沿用 JSON 中记录的 SVG 路径与渐变，外观与原 draw* 一致；
// emoji 类型由用户自选字形，供未来扩展（无需改任何 TS）。

import elementsData from './elements.json';

type FillSpec =
  | { mode: 'solid'; source: 'particle' | 'constant'; color?: string }
  | { mode: 'radial'; stops: { offset: number; color: string }[] };

interface PathSpec {
  d: string;
  fill: FillSpec | null;
  stroke: { color: string; widthPx: number } | null;
}

interface ElementRender {
  type: 'svg' | 'emoji';
  paths?: PathSpec[];
  glyph?: string;
}

interface ElementDescriptor {
  behavior: string;
  render: ElementRender;
}

const ELEMENTS = elementsData as unknown as Record<string, ElementDescriptor>;

// Path2D 缓存：同一条 path 数据只构建一次
const pathCache = new Map<string, Path2D>();
function getPath(d: string): Path2D {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(d, p);
  }
  return p;
}

function resolveFill(
  ctx: CanvasRenderingContext2D,
  fill: FillSpec,
  particleColor: string,
): string | CanvasGradient {
  if (fill.mode === 'solid') {
    return fill.source === 'particle' ? particleColor : (fill.color ?? 'transparent');
  }
  // radial：在归一化 [-1,1] 空间，半径 1 经 size 缩放后等于原 draw* 的半径 size
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const s of fill.stops) {
    grad.addColorStop(s.offset, s.color);
  }
  return grad;
}

export interface DrawParticleOpts {
  type: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  color: string;
}

// 统一绘制入口：按元素类型从 JSON 描述符渲染
export function drawParticle(ctx: CanvasRenderingContext2D, o: DrawParticleOpts): void {
  const desc = ELEMENTS[o.type];
  if (!desc) return;
  const render = desc.render;

  // emoji：用户自选字形，按 size*2 字号绘制
  if (render.type === 'emoji') {
    ctx.save();
    ctx.globalAlpha = Math.max(0, o.opacity);
    ctx.translate(o.x, o.y);
    ctx.font = `${o.size * 2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (render.glyph) ctx.fillText(render.glyph, 0, 0);
    ctx.restore();
    return;
  }

  // svg：在归一化 [-1,1] 空间按 size 缩放绘制，使外观与原 draw* 完全一致
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rotation);
  ctx.globalAlpha = Math.max(0, o.opacity);
  ctx.scale(o.size, o.size);
  for (const path of render.paths ?? []) {
    const p2d = getPath(path.d);
    if (path.fill) {
      ctx.fillStyle = resolveFill(ctx, path.fill, o.color);
      ctx.fill(p2d);
    }
    if (path.stroke) {
      // 线宽在缩放上下文中需除以 size，使最终像素宽度 = widthPx（与原 draw* 一致）
      ctx.lineWidth = path.stroke.widthPx / o.size;
      ctx.strokeStyle = path.stroke.color;
      ctx.stroke(p2d);
    }
  }
  ctx.restore();
}
