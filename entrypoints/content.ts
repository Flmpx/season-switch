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

// 🔢 粒子目标数量 — 同屏维持的飘落粒子数
// 季节切换时，当前粒子不会被清除，新季节粒子会叠加出现
const PARTICLE_COUNTS = { spring: 22, summer: 33, autumn: 48, winter: 60 };

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

// ---- AtmosphereRenderer ----

class AtmosphereRenderer {
  private overlay: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lensFlare: HTMLDivElement | null = null;

  private particles: FallingParticle[] = [];
  private settings: Settings | null = null;
  private weights: SeasonWeights = { spring: 1, summer: 0, autumn: 0, winter: 0 };
  private intensity = 1.0;
  private frameId = 0;
  private width = 0;
  private height = 0;
  private unsubscribe: (() => void) | null = null;
  private ctxRef: ContentScriptContext;

  constructor(ctx: ContentScriptContext) {
    this.ctxRef = ctx;

    // Color overlay div
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '2147483646',
      transition: 'background-color 1.2s ease',
    });

    // Canvas for particles + pile
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

    this.updateOverlay();
    this.updateLensFlare();
    this.updateParticles();
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

  // ---- Lens Flare (Summer) ----

  private updateLensFlare() {
    // 夏季镜头炫光 — 当夏权重 > 0.3 时显示
    const show = this.weights.summer > 0.3;
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
      if (!show) {
        this.lensFlare.remove();
        this.lensFlare = null;
      }
    }
  }

  // ---- Particles ----

  private updateParticles() {
    // Never clear existing particles — they naturally fall and fade.
    // Only spawn new ones to match the current season target.
    const { spring, summer, autumn, winter } = this.weights;

    const currentLeaf = this.particles.filter((p) => p.type === 'leaf').length;
    const currentSnow = this.particles.filter((p) => p.type === 'snow').length;

    const targetLeaf = Math.round(
      PARTICLE_COUNTS.spring * spring +
      PARTICLE_COUNTS.summer * summer +
      PARTICLE_COUNTS.autumn * autumn,
    );
    const targetSnow = Math.round(PARTICLE_COUNTS.winter * winter);

    if (currentLeaf < targetLeaf) {
      for (let i = 0; i < targetLeaf - currentLeaf; i++) {
        this.particles.push(this.createLeaf());
      }
    }
    if (currentSnow < targetSnow) {
      for (let i = 0; i < targetSnow - currentSnow; i++) {
        this.particles.push(this.createSnow());
      }
    }
  }

  private createLeaf(): FallingParticle {
    const { spring, summer, autumn } = this.weights;
    // 根据当前季节权重随机选择叶子属于哪个季节的色板
    const rand = Math.random() * (spring + summer + autumn);
    let colors: string[];
    let sizeMin: number, sizeMax: number;
    if (rand < spring) {
      colors = LEAF_COLORS.spring;
      sizeMin = 4; sizeMax = 8;     // 🍃 春叶尺寸范围（像素）
    } else if (rand < spring + summer) {
      colors = LEAF_COLORS.summer;
      sizeMin = 5; sizeMax = 9;     // 🍃 夏叶尺寸范围（像素）
    } else {
      colors = LEAF_COLORS.autumn;
      sizeMin = 5; sizeMax = 10;    // 🍃 秋叶尺寸范围（像素）
    }

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
    return {
      x: Math.random() * this.width,
      y: -20 - Math.random() * this.height,
      size: 3 + Math.random() * 7,            // ❄️ 雪花尺寸范围 3~10（像素）
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

    // Replenish particles if below target
    this.replenishParticles();
  };

  private replenishParticles() {
    if (!this.settings) return;
    const { spring, summer, autumn, winter } = this.weights;
    const targetLeaf = Math.round(
      PARTICLE_COUNTS.spring * spring +
      PARTICLE_COUNTS.summer * summer +
      PARTICLE_COUNTS.autumn * autumn,
    );
    const targetSnow = Math.round(PARTICLE_COUNTS.winter * winter);

    const currentLeaf = this.particles.filter((p) => p.type === 'leaf').length;
    const currentSnow = this.particles.filter((p) => p.type === 'snow').length;

    if (currentLeaf < targetLeaf) this.particles.push(this.createLeaf());
    if (currentSnow < targetSnow) this.particles.push(this.createSnow());
  }

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
