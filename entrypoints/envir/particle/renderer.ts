// 统一渲染器：按 elements.json 的描述符绘制粒子（内置 SVG 或用户 emoji）
import elementsData from './elements.json';

/** 填充样式：纯色或径向渐变 */
type FillSpec =
  | { mode: 'solid'; source: 'particle' | 'constant'; color?: string }
  | { mode: 'radial'; stops: { offset: number; color: string }[] };

/** 单条 SVG 路径 */
interface PathSpec {
  d: string; // SVG path 数据
  fill: FillSpec | null; // 填充
  stroke: { color: string; widthPx: number } | null; // 描边（像素宽）
}

/** 元素渲染描述 */
interface ElementRender {
  type: 'svg' | 'emoji'; // 渲染方式
  paths?: PathSpec[]; // SVG 路径集合
  glyph?: string; // emoji 字形
}

/** 元素描述（renderer 仅取渲染所需字段） */
interface ElementDescriptor {
  render: ElementRender;
}

const ELEMENTS = elementsData as unknown as Record<string, ElementDescriptor>;

// Path2D 缓存：同一条 path 数据只构建一次
const pathCache = new Map<string, Path2D>();

/* 取（或缓存）Path2D 对象 */
function getPath(d: string): Path2D {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(d, p);
  }
  return p;
}

/* 解析填充：纯色取粒子色或常量色，径向渐变在归一化 [-1,1] 空间构造 */
function resolveFill(
  ctx: CanvasRenderingContext2D,
  fill: FillSpec,
  particleColor: string,
): string | CanvasGradient {
  if (fill.mode === 'solid') {
    return fill.source === 'particle' ? particleColor : (fill.color ?? 'transparent');
  }
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const s of fill.stops) {
    grad.addColorStop(s.offset, s.color);
  }
  return grad;
}

/** 绘制参数 */
export interface DrawParticleOpts {
  type: string; // 元素类型
  x: number; // 横坐标
  y: number; // 纵坐标
  size: number; // 尺寸
  rotation: number; // 旋转角
  opacity: number; // 不透明度
  color: string; // 颜色
}

/* 统一绘制入口：按元素类型从 JSON 描述符渲染 */
export function drawParticle(ctx: CanvasRenderingContext2D, o: DrawParticleOpts): void {
  const desc = ELEMENTS[o.type];
  if (!desc) return;
  const render = desc.render;

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
      ctx.lineWidth = path.stroke.widthPx / o.size;
      ctx.strokeStyle = path.stroke.color;
      ctx.stroke(p2d);
    }
  }
  ctx.restore();
}
