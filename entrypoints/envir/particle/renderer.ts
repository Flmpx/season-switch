/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import type { ElementRender, PathFill, PathSpec } from './elements';
import { getImage } from './assets';

/* Path2D 缓存，同一条路径数据只构建一次 */
const pathCache = new Map<string, Path2D>();

/* 取缓存的 Path2D，没有就新建 */
function getPath(d: string): Path2D {
  let p = pathCache.get(d);
  if (!p) {
    p = new Path2D(d);
    pathCache.set(d, p);
  }
  return p;
}

/* 解析填充：纯色取粒子色或常量色，径向渐变在归一化空间构造 */
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

/* 绘制参数 */
export interface DrawParticleOpts {
  x: number; // 横坐标
  y: number; // 纵坐标
  size: number; // 尺寸（px），图片与文字按高度算
  rotation: number; // 旋转角
  opacity: number; // 不透明度 0-1
  color: string; // 粒子色，svg 填充与文字使用
}

/**
 * 绘制 SVG 路径集合
 * 路径已归一化到 [-1,1]；带 matrix 的先应用坐标变换，描边按矩阵缩放补偿以保持视觉粗细
 */
function drawSvg(ctx: CanvasRenderingContext2D, paths: PathSpec[], o: DrawParticleOpts): void {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rotation);
  ctx.globalAlpha = Math.max(0, o.opacity);
  ctx.scale(o.size, o.size);
  for (const path of paths) {
    const p2d = getPath(path.d);
    const m = path.matrix;
    const scale = m ? Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1 : 1;
    if (m) {
      ctx.save();
      ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    }
    if (path.fill) {
      ctx.fillStyle = resolveFill(ctx, path.fill, o.color);
      ctx.fill(p2d);
    }
    if (path.stroke) {
      ctx.lineWidth = path.stroke.widthPx / (o.size * scale);
      ctx.strokeStyle = path.stroke.color;
      ctx.stroke(p2d);
    }
    if (m) ctx.restore();
  }
  ctx.restore();
}

/* 绘制图片精灵：size 为高度，宽度按宽高比等比 */
function drawImageSprite(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  aspect: number,
  o: DrawParticleOpts,
): void {
  const ratio = Math.max(0.1, Math.min(10, aspect || 1));
  const h = o.size;
  const w = h * ratio;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rotation);
  ctx.globalAlpha = Math.max(0, o.opacity);
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/* 统一绘制入口，按外观类型分四路；图片未就绪时跳过本帧 */
export function drawParticle(
  ctx: CanvasRenderingContext2D,
  render: ElementRender,
  o: DrawParticleOpts,
): void {
  if (render.kind === 'svg') {
    drawSvg(ctx, render.paths, o);
    return;
  }

  if (render.kind === 'image') {
    const source = getImage(render.assetId);
    if (source) drawImageSprite(ctx, source, render.aspect, o);
    return;
  }

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rotation);
  ctx.globalAlpha = Math.max(0, o.opacity);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (render.kind === 'emoji') {
    ctx.font = `${o.size}px serif`;
    ctx.fillText(render.glyph, 0, 0);
  } else {
    ctx.font = `${render.fontWeight} ${o.size}px ${render.fontFamily}`;
    ctx.fillStyle = render.color;
    ctx.fillText(render.text, 0, 0);
  }
  ctx.restore();
}
