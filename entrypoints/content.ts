/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */
import { loadSettings, onSettingsChanged, type Settings } from '../lib/settings';
import { getSeasonWeights, type SeasonWeights } from '../lib/season-weights';

import { getIntensityValue } from './envir/intensity';
import { getParticleRate, getParticleSizeScale, spawnParticles, type FallingParticle } from './envir/particle';
import {
  TIME_OF_DAY_HOURS,
  getTimeBrightness,
  updateBrightnessOverlay,
} from './envir/light';
import { LensFlare } from './envir/halo';
import { drawLeaf } from './envir/leaf';
import { drawSnow } from './envir/snow';
import { updateStars, drawStar, type Star } from './envir/star';

// 🎨 季节色调 — 用于整个页面的淡淡色彩覆盖层 (RGB)
const SEASON_TINTS: Record<string, { r: number; g: number; b: number }> = {
  spring: { r: 120, g: 200, b: 100 }, // 春：朦胧绿
  summer: { r: 255, g: 220, b: 100 }, // 夏：金黄阳光
  autumn: { r: 220, g: 180, b: 60 }, // 秋：秋日黄
  winter: { r: 200, g: 210, b: 230 }, // 冬：淡蓝白
};

// ---- AtmosphereRenderer ----

class AtmosphereRenderer {
  private overlay: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  // ✨ 夏季镜头炫光
  private lensFlare = new LensFlare();
  // 🌑 亮度遮罩层 — 通过黑色 rgba 降低页面整体亮度，模拟时段光线
  private brightnessOverlay: HTMLDivElement;

  private particles: FallingParticle[] = [];
  private stars: Star[] = []; // ⭐ 星光数组
  private settings: Settings | null = null;
  private weights: SeasonWeights = { spring: 1, summer: 0, autumn: 0, winter: 0 };
  private intensity = 1.0;
  private particleRate = 50 / 60; // 每秒生成粒子数（由 个/分钟 转换）
  private particleSizeScale = 1.0; // 粒子尺寸缩放系数（1.0 = 中等）
  private timeBrightness = 1.0; // 时间亮度系数（1.0 = 不降低亮度）
  private currentHour = 12; // 当前小时（0-23），用于判断是否显示夏季光晕
  private spawnAccumulator = 0; // 生成累加器（秒）
  private frameId = 0;
  private width = 0;
  private height = 0;
  private unsubscribe: (() => void) | null = null;
  private ctxRef: ContentScriptContext;

  constructor(ctx: ContentScriptContext) {
    this.ctxRef = ctx;

    // Color overlay div (底层：季节色调)
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '2147483645',
      transition: 'background-color 1.2s ease',
    });

    // 🌑 亮度遮罩层 — 黑色 rgba，透明度由时段亮度决定
    // 位于色调层之上、粒子层之下，这样粒子始终可见
    this.brightnessOverlay = document.createElement('div');
    Object.assign(this.brightnessOverlay.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '2147483646',
      transition: 'background-color 1.2s ease',
    });

    // Canvas for particles (顶层：粒子)
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '2147483647',
    });
    this.ctx = this.canvas.getContext('2d')!;

    // Append to DOM
    document.documentElement.appendChild(this.overlay);
    document.documentElement.appendChild(this.brightnessOverlay);
    document.documentElement.appendChild(this.canvas);

    // Resize handling
    this.handleResize();
    ctx.addEventListener(window, 'resize', () => this.handleResize());

    // Listen for settings changes
    this.unsubscribe = onSettingsChanged((s) => this.applySettings(s));

    // Cleanup
    ctx.onInvalidated(() => this.destroy());

    // Initial load
    this.init();
  }

  private async init() {
    const settings = await loadSettings();
    this.applySettings(settings);
    this.animate();
  }

  // ---- Settings & Weights ----

  private applySettings(settings: Settings) {
    this.settings = settings;
    this.weights = getSeasonWeights(settings.season, settings.customMonth);
    this.intensity = getIntensityValue(settings);
    this.particleRate = getParticleRate(settings);
    this.particleSizeScale = getParticleSizeScale(settings);
    this.timeBrightness = getTimeBrightness(settings);

    // 计算当前小时（0-23，用于判断是否显示夏季光晕，仅在 6-18 点显示）
    if (settings.timeOfDay === 'custom-time') {
      this.currentHour = settings.customHour;
    } else if (settings.timeOfDay === 'system-time') {
      this.currentHour = new Date().getHours();
    } else {
      this.currentHour = TIME_OF_DAY_HOURS[settings.timeOfDay] ?? 12;
    }

    this.updateOverlay();
    updateBrightnessOverlay(this.brightnessOverlay, this.timeBrightness);
    this.lensFlare.update(this.weights, this.intensity, this.currentHour);
  }

  // ---- Color Overlay ----

  private updateOverlay() {
    const { spring, summer, autumn, winter } = this.weights;
    const t = SEASON_TINTS;
    const r = Math.round(spring * t.spring.r + summer * t.summer.r + autumn * t.autumn.r + winter * t.winter.r);
    const g = Math.round(spring * t.spring.g + summer * t.summer.g + autumn * t.autumn.g + winter * t.winter.g);
    const b = Math.round(spring * t.spring.b + summer * t.summer.b + autumn * t.autumn.b + winter * t.winter.b);
    // 色彩覆盖层透明度上限 0.15，基数 0.04 × intensity
    const a = Math.min(0.15, 0.04 * this.intensity);
    this.overlay.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  // ---- Animation Loop ----

  private lastTime = 0;

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap dt to avoid jumps
    this.lastTime = now;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Update and draw particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Wobble
      p.wobblePhase += p.wobbleSpeed * dt;
      const wobbleX = Math.sin(p.wobblePhase) * p.wobbleAmp * dt;

      p.x += wobbleX;
      p.y += p.speedY * dt;
      p.rotation += p.rotSpeed * dt;

      // 着陆：到达窗口底部后停下，缓慢渐隐消失
      const groundY = this.height - p.size;
      if (p.y >= groundY) {
        p.y = groundY;
        p.speedY = 0;
        p.rotSpeed = 0;
        p.opacity -= dt * 0.5; // 渐隐速度（值越大消失越快，0.5 ≈ 2秒消失）
      }

      // Remove if faded out
      if (p.opacity <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Draw
      const drawOpacity = p.opacity * Math.min(this.intensity, 1.5);
      if (p.type === 'leaf') {
        drawLeaf(this.ctx, p.x, p.y, p.size, p.color, p.rotation, drawOpacity);
      } else {
        drawSnow(this.ctx, p.x, p.y, p.size, drawOpacity);
      }
    }

    // 根据生成速率生成新粒子
    this.spawnAccumulator = spawnParticles(
      this.particles,
      this.weights,
      this.particleRate,
      this.particleSizeScale,
      this.width,
      this.height,
      dt,
      this.spawnAccumulator,
    );

    // ⭐ 星光：调整数量至目标，更新闪烁相位，绘制
    updateStars(this.stars, this.currentHour, this.intensity, this.width, this.height);
    for (const star of this.stars) {
      star.twinklePhase += star.twinkleSpeed * dt;
      drawStar(this.ctx, star, this.intensity);
    }
  };

  // ---- Resize ----

  private handleResize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- Cleanup ----

  private destroy() {
    cancelAnimationFrame(this.frameId);
    this.overlay.remove();
    this.brightnessOverlay.remove();
    this.canvas.remove();
    this.lensFlare.remove();
    this.unsubscribe?.();
  }
}

// ---- Content Script Entry ----

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main(ctx) {
    if (document.getElementById('atmo-overlay')) return;
    new AtmosphereRenderer(ctx);
  },
});
