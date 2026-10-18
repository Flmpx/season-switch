/**
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/**
 * 管理页实时预览：180×180 画布
 * 复用内容脚本的 drawParticle，图形与颜色和网页一致
 * 动画按元素自身的 motion 参数播放
 */
import { drawParticle, preloadAssets } from '../envir/particle';
import type { ElementDescriptor } from '../envir/particle/elements';

/* 画布边长，单位为 CSS 像素 */
const VIEW = 180;
/* 单个粒子的绘制尺寸 */
const SPRITE = 72;
/* 摆动位移上限，避免粒子飘出画布 */
const MAX_DRIFT = 26;

/* 预览面板实例 */
export interface Preview {
  root: HTMLElement; // 根节点
  update(desc: ElementDescriptor, color: string): void; // 更新预览内容
  dispose(): void; // 停止动画循环
}

/**
 * 创建预览面板
 * 画布离开文档时自动停止，摆幅按预览尺寸缩放
 * 图片外观需先预载资产，就绪前跳过该帧
 */
export function createPreview(): Preview {
  const root = document.createElement('div');
  root.className = 'preview';

  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(VIEW * dpr);
  canvas.height = Math.round(VIEW * dpr);
  canvas.style.width = `${VIEW}px`;
  canvas.style.height = `${VIEW}px`;
  root.appendChild(canvas);

  const caption = document.createElement('div');
  caption.className = 'preview-caption';
  root.appendChild(caption);

  const ctx = canvas.getContext('2d');
  let desc: ElementDescriptor | null = null;
  let color = '#ffffff';
  let rotation = 0;
  let elapsed = 0;
  let lastTime = 0;
  let raf = 0;
  let disposed = false;

  function frame(time: number): void {
    if (disposed) return;
    if (!root.isConnected) {
      disposed = true;
      cancelAnimationFrame(raf);
      return;
    }
    const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
    lastTime = time;
    elapsed += dt;

    const motion = desc?.motion;
    rotation += dt * (motion ? motion.rotationSpeed : 0);

    const wobbleSpeed = motion ? Math.max(0.15, motion.wobbleSpeed) : 0;
    const amp = motion ? Math.min(MAX_DRIFT, motion.wobbleAmp * 0.5) : 0;
    const dx = Math.sin(elapsed * wobbleSpeed) * amp * 0.35;
    const dy = Math.cos(elapsed * wobbleSpeed) * amp * 0.55;

    let opacity = motion ? motion.opacity : 1;
    if (motion && desc?.behavior === 'twinkle') {
      const speed = Math.max(0.2, motion.twinkleSpeed || 1.9);
      opacity *= 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsed * speed * 3));
    } else {
      opacity *= 0.9 + 0.1 * Math.sin(elapsed * 1.3);
    }

    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VIEW, VIEW);

    if (desc) {
      drawParticle(ctx, desc.render, {
        x: VIEW / 2 + dx,
        y: VIEW / 2 + dy,
        size: SPRITE,
        rotation,
        opacity,
        color,
      });
    }

    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);

  return {
    root,
    update(next, nextColor) {
      desc = next;
      color = nextColor;
      if (next.render.kind === 'image') void preloadAssets([next.render.assetId]);
      const behavior = next.behavior === 'fall' ? '飘落' : '闪烁';
      caption.textContent = `${next.label} · ${behavior} · ${next.defaults.size}px`;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
    },
  };
}
