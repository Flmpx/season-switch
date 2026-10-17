/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 统一渲染器：按元素外观描述符（render）绘制粒子，四种来源共用同一入口。
import type { ElementRender, PathFill, PathSpec } from './elements';

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
  fill: PathFill,
  particleColor: string,
): string | CanvasGradient {
  if (fill.mode === 'solid') {
    return fill.source === 'particle' ? particleColor : (fill.color ?? 'transparent');
  }
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const s of fill.stops) grad.addColorStop(s.offset, s.color);
  return grad;
}

/** 绘制参数 */
export interface DrawParticleOpts {
  x: number; // 横坐标
  y: number; // 纵坐标
  size: number; // 尺寸（px，也是文字/emoji 字号）
  rotation: number; // 旋转角
  opacity: number; // 不透明度 0-1
  color: string; // 颜色（svg 的 source:particle 与文字使用）
}

/* 绘制 SVG 路径集合（路径已归一化到 [-1,1]） */
function drawSvg(ctx: CanvasRenderingContext2D, paths: PathSpec[], o: DrawParticleOpts): void {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rotation);
  ctx.globalAlpha = Math.max(0, o.opacity);
  ctx.scale(o.size, o.size);
  for (const path of paths) {
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

/* 统一绘制入口：按外观 kind 分四路 */
export function drawParticle(
  ctx: CanvasRenderingContext2D,
  render: ElementRender,
  o: DrawParticleOpts,
): void {
  if (render.kind === 'svg') {
    drawSvg(ctx, render.paths, o);
    return;
  }
  // image 分支：待 P2 接入资产加载（assets.ts + drawImage），当前不绘制
  if (render.kind === 'image') return;

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.globalAlpha = Math.max(0, o.opacity);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (render.kind === 'emoji') {
    ctx.font = `${o.size}px serif`;
    ctx.fillText(render.glyph, 0, 0);
  } else {
    // text
    ctx.font = `${render.fontWeight} ${o.size}px ${render.fontFamily}`;
    ctx.fillStyle = render.color;
    ctx.fillText(render.text, 0, 0);
  }
  ctx.restore();
}
