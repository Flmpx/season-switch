/**
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/**
 * 管理页实时预览：180×180 画布
 * 复用内容脚本的 drawParticle，图形与颜色和网页一致
 * 动画按元素自身的 motion 参数播放
 */
import { drawParticle, preloadAssets, middlePresetIndex } from '../envir/particle';
import type { ElementDescriptor, ElementRender } from '../envir/particle/elements';

const VIEW = 180; // 画布边长，单位为 CSS 像素
const SPRITE = 52; // 单个粒子的绘制尺寸，保证旋转到斜角也不碰画布边缘
const MAX_DRIFT = 12; // 摆动位移上限，避免粒子飘出画布
const MAX_ASPECT = 2; // 图片宽高比上限，过宽的图形横向会捅出画布

/** 预览面板实例 */
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
  let sprite: ElementRender | null = null;
  let color = '#ffffff';
  let lastBehavior: string | null = null; // 上次预览的行为，切换时重置动画相位
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
    const falling = desc?.behavior !== 'twinkle';
    if (falling) rotation += dt * (motion ? motion.rotationSpeed : 0);

    const wobbleSpeed = falling && motion ? motion.wobbleSpeed : 0;
    const amp = falling && motion ? Math.min(MAX_DRIFT, motion.wobbleAmp * 0.5) : 0;
    const dx = Math.sin(elapsed * wobbleSpeed) * amp * 0.35;
    const dy = Math.cos(elapsed * wobbleSpeed) * amp * 0.55;

    let opacity = motion ? motion.opacity : 1;
    if (falling) {
      opacity *= 0.9 + 0.1 * Math.sin(elapsed * 1.3);
    } else {
      const speed = motion ? motion.twinkleSpeed : 1.9;
      opacity *= 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(elapsed * speed));
    }

    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, VIEW, VIEW);

    if (desc && sprite) {
      drawParticle(ctx, sprite, {
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
      if (next.behavior !== lastBehavior) {
        lastBehavior = next.behavior;
        rotation = 0;
        elapsed = 0;
      }
      desc = next;
      sprite =
        next.render.kind === 'image'
          ? {
              ...next.render,
              aspect: Math.min(MAX_ASPECT, Math.max(1 / MAX_ASPECT, next.render.aspect)),
            }
          : next.render;
      color = nextColor;
      if (next.render.kind === 'image') void preloadAssets([next.render.assetId]);
      const behavior = next.behavior === 'fall' ? '飘落' : '闪烁';
      const sizes = next.presets.size;
      const size = sizes.length > 0 ? sizes[middlePresetIndex(sizes.length)] : 6;
      caption.textContent = `${next.label} · ${behavior} · ${size}px`;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
    },
  };
}
