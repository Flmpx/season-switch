/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */
import { loadSettings, onSettingsChanged, type Settings } from '../lib/settings';
import { getSeasonWeights, type SeasonWeights } from '../lib/season-weights';

// ---- Constants ----

// 显示程度 → 强度系数映射（影响色彩覆盖透明度、粒子绘制的透明度）
// 数值越大氛围越浓
const INTENSITY_MAP: Record<string, number> = {
  misty: 0.4,               // 朦朦
  light: 0.7,               // 浅
  medium: 1.0,              // 中（默认）
  deep: 1.4,                // 深
  'custom-intensity': 0.5,  // 自定义（实际值由 customIntensity 字段决定）
};

// 🍃 叶子颜色 — 每个季节的色板，增删颜色直接影响叶子多样性
const LEAF_COLORS = {
  spring: ['#8FBC8F', '#90EE90', '#7CCD7C', '#98FB98', '#66CD66'],  // 春：嫩绿色系
  summer: ['#2E8B57', '#3CB371', '#228B22'],                         // 夏：深绿色系
  autumn: ['#DAA520', '#FFD700', '#FF8C00', '#D2691E', '#8B4513'],   // 秋：金黄/枯黄色系（含枯黄 #D2691E #8B4513）
};

// 🎨 季节色调 — 用于整个页面的淡淡色彩覆盖层 (RGB)
const SEASON_TINTS: Record<string, { r: number; g: number; b: number }> = {
  spring: { r: 120, g: 200, b: 100 },   // 春：朦胧绿
  summer: { r: 255, g: 220, b: 100 },    // 夏：金黄阳光
  autumn: { r: 220, g: 180, b: 60 },     // 秋：秋日黄
  winter: { r: 200, g: 210, b: 230 },    // 冬：淡蓝白
};

// 🔢 粒子数目预设值 — 每分钟生成粒子数（个/分钟）
// 滑块范围 10~1800，预设值在范围内选取
const PARTICLE_RATE_MAP: Record<string, number> = {
  minimal: 10,           // 微量
  few: 20,              // 少量
  medium: 50,           // 中等（默认）
  heavy: 120,           // 大量
  'custom-particle': 50, // 自定义（实际值由 customParticleCount 字段决定）
};

// 📏 粒子大小预设值 — 尺寸缩放系数（1.0 = 当前默认大小，即"中等"）
// 小=0.6 / 中=1.0 / 大=1.5
const PARTICLE_SIZE_MAP: Record<string, number> = {
  small: 0.6,        // 小
  medium: 1.0,       // 中（默认）
  large: 1.5,        // 大
  'custom-size': 1.0, // 自定义（实际值由 customParticleSize 字段决定）
};

// 🍃 各季节叶子尺寸范围（像素）— 中等大小基准
// 粒子大小设置通过缩放系数同时改变 min 和 max
const LEAF_SIZE_RANGES: Record<string, { min: number; max: number }> = {
  spring: { min: 4, max: 8 },   // 春叶
  summer: { min: 5, max: 9 },   // 夏叶
  autumn: { min: 5, max: 10 },  // 秋叶
};

// ❄️ 雪花尺寸范围（像素）— 中等大小基准
const SNOW_SIZE_RANGE = { min: 3, max: 10 };

// 🌓 时段 → 小时映射（0-23）— 用于计算页面亮度
// 中午=12点（最亮），深夜=0点（最暗）
const TIME_OF_DAY_HOURS: Record<string, number> = {
  dawn: 6,        // 清晨
  morning: 10,    // 上午
  noon: 12,       // 中午（最亮，不降低亮度）
  afternoon: 15,  // 下午
  dusk: 18,       // 傍晚
  evening: 21,    // 晚上
  midnight: 0,    // 深夜（最暗，0点）
};

// ⚙️ 可调节的最低亮度系数 — 深夜时页面亮度降低到该值（0~1）
// 调大 → 深夜更亮；调小 → 深夜更暗（但不应低于 0.5，以免影响网页阅读）
const MIN_BRIGHTNESS = 0.7;

// 时段预设的亮度系数（1.0 = 不降低亮度）
const TIME_OF_DAY_BRIGHTNESS: Record<string, number> = {
  dawn: 0.85,      // 清晨
  morning: 0.95,   // 上午
  noon: 1.0,       // 中午（最亮）
  afternoon: 0.95, // 下午
  dusk: 0.8,       // 傍晚
  evening: 0.7,    // 晚上
  midnight: MIN_BRIGHTNESS, // 深夜（最暗）
};

// ---- Particle types ----

interface FallingParticle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  type: 'leaf' | 'snow';
  color: string;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleAmp: number;
}

// ---- Helpers ----

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getIntensityValue(settings: Settings): number {
  if (settings.intensity === 'custom-intensity') {
    return (settings.customIntensity / 50); // 0→0, 50→1, 100→2
  }
  return INTENSITY_MAP[settings.intensity] ?? 1.0;
}

function getParticleRate(settings: Settings): number {
  // 设置值为 个/分钟，内部转换为 个/秒
  let perMinute: number;
  if (settings.particleCount === 'custom-particle') {
    perMinute = settings.customParticleCount;
  } else {
    perMinute = PARTICLE_RATE_MAP[settings.particleCount] ?? 50;
  }
  return perMinute / 60;
}

function getParticleSizeScale(settings: Settings): number {
  // 自定义 0-100%：0%→0.3, 50%→1.0（中等）, 100%→1.8
  // 分段线性插值，保证 50% 恰好为 1.0
  if (settings.particleSize === 'custom-size') {
    const v = settings.customParticleSize;
    if (v <= 50) {
      return 0.3 + (v / 50) * 0.7; // 0→0.3, 50→1.0
    }
    return 1.0 + ((v - 50) / 50) * 0.8; // 50→1.0, 100→1.8
  }
  return PARTICLE_SIZE_MAP[settings.particleSize] ?? 1.0;
}

// 🌓 根据时间设置计算页面亮度系数（1.0 = 不降低亮度）
// 自定义时间 / 跟随系统：根据小时（0-23），在中午(12点,亮度1.0)和深夜(0点,亮度MIN_BRIGHTNESS)之间插值
function getTimeBrightness(settings: Settings): number {
  // 预设时段直接返回对应亮度
  if (settings.timeOfDay in TIME_OF_DAY_BRIGHTNESS) {
    return TIME_OF_DAY_BRIGHTNESS[settings.timeOfDay];
  }

  // 自定义时间或跟随系统：取小时值（0-23）
  let hour: number;
  if (settings.timeOfDay === 'custom-time') {
    hour = settings.customHour;
  } else {
    // system-time
    hour = new Date().getHours();
  }

  // 将 0~23 小时映射到亮度系数
  // 12 点为最亮 (1.0)，0 点为最暗 (MIN_BRIGHTNESS)
  // 使用余弦曲线平滑过渡：cos((hour-12)/12 * π) → 12点=1.0, 0点=-1.0
  const normalized = (hour - 12) / 12; // -1 ~ 1
  const cos = Math.cos(normalized * Math.PI); // 12点=1, 0点=-1
  // 映射到 [MIN_BRIGHTNESS, 1.0]
  return MIN_BRIGHTNESS + ((cos + 1) / 2) * (1.0 - MIN_BRIGHTNESS);
}

// ---- AtmosphereRenderer ----

class AtmosphereRenderer {
  private overlay: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lensFlare: HTMLDivElement | null = null;
  // 🌑 亮度遮罩层 — 通过黑色 rgba 降低页面整体亮度，模拟时段光线
  private brightnessOverlay: HTMLDivElement;

  private particles: FallingParticle[] = [];
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
    this.updateBrightnessOverlay();
    this.updateLensFlare();
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

  // ---- Brightness Overlay (Time of Day) ----

  private updateBrightnessOverlay() {
    // 🌑 亮度遮罩 — 黑色 rgba，亮度系数越低透明度越高
    // timeBrightness = 1.0 时（中午）完全透明，不降低亮度
    // timeBrightness = MIN_BRIGHTNESS 时（深夜）透明度最高
    const darkness = 1.0 - this.timeBrightness; // 0~(1-MIN_BRIGHTNESS)
    this.brightnessOverlay.style.backgroundColor = `rgba(0, 0, 0, ${darkness})`;
  }

  // ---- Lens Flare (Summer) ----

  private updateLensFlare() {
    // 夏季镜头炫光 — 当夏权重 > 0.3 且时间为 6-18 点（白天）时显示
    const isDaytime = this.currentHour >= 6 && this.currentHour <= 18;
    const show = this.weights.summer > 0.3 && isDaytime;
    if (show && !this.lensFlare) {
      this.lensFlare = document.createElement('div');
      Object.assign(this.lensFlare.style, {
        position: 'fixed',
        top: '5vh',
        right: '10vw',
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,200,0.25) 0%, rgba(255,240,150,0.08) 35%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: '2147483646',
        filter: 'blur(15px)',
        transition: 'opacity 1.2s ease',
      });
      document.documentElement.appendChild(this.lensFlare);
    }
    if (this.lensFlare) {
      this.lensFlare.style.opacity = String(this.weights.summer * this.intensity * 0.6);
      this.lensFlare.style.zIndex = '2147483646';
      if (!show) {
        this.lensFlare.remove();
        this.lensFlare = null;
      }
    }
  }

  // ---- Particles ----

  // 根据生成速率和季节权重，每帧决定是否生成新粒子
  private spawnParticles(dt: number) {
    if (!this.settings) return;
    const { spring, summer, autumn, winter } = this.weights;

    // 生成速率按季节权重分配：叶子和雪花各自的比例
    const leafWeight = spring + summer + autumn;
    const snowWeight = winter;

    // 累加器推进
    this.spawnAccumulator += dt * this.particleRate;

    // 每积累1个粒子就生成一个
    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;

      // 按权重随机决定生成叶子还是雪花
      const rand = Math.random() * (leafWeight + snowWeight);
      if (rand < leafWeight) {
        this.particles.push(this.createLeaf());
      } else {
        this.particles.push(this.createSnow());
      }
    }
  }

  private createLeaf(): FallingParticle {
    const { spring, summer, autumn } = this.weights;
    // 根据当前季节权重随机选择叶子属于哪个季节的色板
    const rand = Math.random() * (spring + summer + autumn);
    let colors: string[];
    let sizeRange: { min: number; max: number };
    if (rand < spring) {
      colors = LEAF_COLORS.spring;
      sizeRange = LEAF_SIZE_RANGES.spring;     // 🍃 春叶尺寸范围
    } else if (rand < spring + summer) {
      colors = LEAF_COLORS.summer;
      sizeRange = LEAF_SIZE_RANGES.summer;     // 🍃 夏叶尺寸范围
    } else {
      colors = LEAF_COLORS.autumn;
      sizeRange = LEAF_SIZE_RANGES.autumn;     // 🍃 秋叶尺寸范围
    }
    // 应用粒子大小缩放系数到 min/max 边界
    const sizeMin = sizeRange.min * this.particleSizeScale;
    const sizeMax = sizeRange.max * this.particleSizeScale;
    return {
      x: Math.random() * this.width,
      y: -20 - Math.random() * this.height,  // 初始位置：屏幕上方随机高度
      size: sizeMin + Math.random() * (sizeMax - sizeMin),
      speedY: 15 + Math.random() * 25,       // 下落速度（像素/秒）
      rotation: Math.random() * Math.PI * 2,  // 初始旋转角度
      rotSpeed: (Math.random() - 0.5) * 1.5, // 旋转速度（弧度/秒）
      opacity: 0.5 + Math.random() * 0.5,    // 初始透明度 0.5~1.0
      type: 'leaf',
      color: pick(colors),                    // 从对应季节色板中随机取色
      wobblePhase: Math.random() * Math.PI * 2, // 摇摆初始相位
      wobbleSpeed: 0.8 + Math.random() * 1.2,   // 摇摆频率
      wobbleAmp: 15 + Math.random() * 25,        // 摇摆幅度（像素）
    };
  }

  private createSnow(): FallingParticle {
    // 应用粒子大小缩放系数到雪花 min/max 边界
    const sizeMin = SNOW_SIZE_RANGE.min * this.particleSizeScale;
    const sizeMax = SNOW_SIZE_RANGE.max * this.particleSizeScale;
    return {
      x: Math.random() * this.width,
      y: -20 - Math.random() * this.height,
      size: sizeMin + Math.random() * (sizeMax - sizeMin),  // ❄️ 雪花尺寸范围（应用缩放）


      speedY: 10 + Math.random() * 20,         // 下落速度（像素/秒），比叶子慢
      rotation: 0,
      rotSpeed: 0,                              // 雪花不旋转
      opacity: 0.4 + Math.random() * 0.5,      // 初始透明度 0.4~0.9
      type: 'snow',
      color: 'white',
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.4 + Math.random() * 0.8,   // 摇摆频率，比叶子慢
      wobbleAmp: 10 + Math.random() * 20,        // 摇摆幅度，比叶子小
    };
  }

  // ---- Drawing Primitives ----

  // 🍃 叶子绘制 — 贝塞尔曲线叶形 + 中线叶脉
  private drawLeaf(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    angle: number,
    opacity: number,
  ) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, opacity);
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Leaf body
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.6, -size * 0.3, size * 0.6, size * 0.3, 0, size);
    ctx.bezierCurveTo(-size * 0.6, size * 0.3, -size * 0.6, -size * 0.3, 0, -size);
    ctx.fillStyle = color;
    ctx.fill();

    // 叶脉中线
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(0, size * 0.7);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';  // 叶脉颜色：淡黑
    ctx.lineWidth = 0.5;                     // 叶脉粗细
    ctx.stroke();

    ctx.restore();
  }

  // ❄️ 雪花绘制 — 球状径向渐变：内白 → 朦胧边
  private drawSnow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    opacity: number,
  ) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, opacity);

    // 雪花渐变：中心白 0.9 → 中间 0.5 → 边缘透明
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
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
        this.drawLeaf(this.ctx, p.x, p.y, p.size, p.color, p.rotation, drawOpacity);
      } else {
        this.drawSnow(this.ctx, p.x, p.y, p.size, drawOpacity);
      }
    }

    // 根据生成速率生成新粒子
    this.spawnParticles(dt);
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
    this.lensFlare?.remove();
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
