/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

import {
  loadSettings,
  onSettingsChanged,
  type Settings,
  type ElementConfig,
} from '../lib/settings';
import { getSeasonWeights, type SeasonWeights } from '../lib/season-weights';

import { getIntensityValue } from './envir/intensity';
import { ParticleManager } from './envir/particle/manager';
import { getElementConfigs } from './envir/particle';
import {
  TIME_OF_DAY_HOURS,
  getTimeBrightness,
  updateBrightnessOverlay,
} from './envir/light';
import { LensFlare } from './envir/halo';

// 季节色调：用于整页淡淡的色彩覆盖层（RGB）
const SEASON_TINTS: Record<string, { r: number; g: number; b: number }> = {
  spring: { r: 120, g: 200, b: 100 }, // 春：朦胧绿
  summer: { r: 255, g: 220, b: 100 }, // 夏：金黄阳光
  autumn: { r: 220, g: 180, b: 60 }, // 秋：秋日黄
  winter: { r: 200, g: 210, b: 230 }, // 冬：淡蓝白
};

// 氛围渲染协调者：创建三层 DOM 并驱动每帧渲染，自身不含粒子物理
class AtmosphereRenderer {
  private overlay: HTMLDivElement; // 季节色调层
  private canvas: HTMLCanvasElement; // 粒子画布
  private ctx: CanvasRenderingContext2D; // 画布 2D 上下文
  private lensFlare = new LensFlare(); // 夏季镜头炫光
  private brightnessOverlay: HTMLDivElement; // 亮度遮罩层
  private particleManager: ParticleManager; // 粒子统一管理器
  private settings: Settings | null = null; // 当前设置
  private weights: SeasonWeights = { spring: 1, summer: 0, autumn: 0, winter: 0 }; // 四季权重
  private intensity = 1.0; // 显示程度系数
  private configs: Record<string, ElementConfig> = {}; // 各元素配置
  private timeBrightness = 1.0; // 时间亮度系数（1.0 = 不降低亮度）
  private currentHour = 12; // 当前小时（0-23）
  private frameId = 0; // 动画帧句柄
  private width = 0; // 视口宽
  private height = 0; // 视口高
  private unsubscribe: (() => void) | null = null; // 设置变更取消订阅
  private ctxRef: ContentScriptContext; // 内容脚本上下文
  private lastTime = 0; // 上一帧时间戳（毫秒）

  /* 初始化三层 DOM、绑定设置变更与清理、启动渲染 */
  constructor(ctx: ContentScriptContext) {
    this.ctxRef = ctx;

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
    this.particleManager = new ParticleManager(this.ctx);

    document.documentElement.appendChild(this.overlay);
    document.documentElement.appendChild(this.brightnessOverlay);
    document.documentElement.appendChild(this.canvas);

    this.handleResize();
    ctx.addEventListener(window, 'resize', () => this.handleResize());
    this.unsubscribe = onSettingsChanged((s) => this.applySettings(s));
    ctx.onInvalidated(() => this.destroy());
    this.init();
  }

  /* 首次加载设置并启动动画 */
  private async init() {
    const settings = await loadSettings();
    this.applySettings(settings);
    this.animate();
  }

  /* 应用设置：计算权重/强度/配置/亮度并刷新各层与光晕 */
  private applySettings(settings: Settings) {
    this.settings = settings;
    this.weights = getSeasonWeights(settings.season, settings.customMonth);
    this.intensity = getIntensityValue(settings);
    this.configs = getElementConfigs(settings);
    this.timeBrightness = getTimeBrightness(settings);

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

  /* 刷新季节色调层 */
  private updateOverlay() {
    const { spring, summer, autumn, winter } = this.weights;
    const t = SEASON_TINTS;
    const r = Math.round(spring * t.spring.r + summer * t.summer.r + autumn * t.autumn.r + winter * t.winter.r);
    const g = Math.round(spring * t.spring.g + summer * t.summer.g + autumn * t.autumn.g + winter * t.winter.g);
    const b = Math.round(spring * t.spring.b + summer * t.summer.b + autumn * t.autumn.b + winter * t.winter.b);
    const a = Math.min(0.15, 0.04 * this.intensity);
    this.overlay.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  /* 动画循环：每帧生成/维持/更新绘制粒子 */
  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.particleManager.spawnStep(dt, this.weights, this.width, this.height, this.configs);
    this.particleManager.maintainTwinkles(this.currentHour, this.intensity, this.width, this.height, this.configs);
    this.particleManager.step(dt, this.height, this.intensity);
  };

  /* 视口尺寸变化时更新画布尺寸与 DPR */
  private handleResize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* 清理：取消动画、移除 DOM、取消订阅 */
  private destroy() {
    cancelAnimationFrame(this.frameId);
    this.overlay.remove();
    this.brightnessOverlay.remove();
    this.canvas.remove();
    this.lensFlare.remove();
    this.unsubscribe?.();
  }
}

// 内容脚本入口：避免重复注入，创建渲染器
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main(ctx) {
    if (document.getElementById('atmo-overlay')) return;
    new AtmosphereRenderer(ctx);
  },
});
