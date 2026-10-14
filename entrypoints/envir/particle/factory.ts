// 数据驱动粒子工厂：读 elements.json 描述符构造粒子实例，新增元素只需改 JSON
import { Particle } from './particle';
import { FallingParticle } from './particle';
import { TwinklingParticle } from './particle';
import type { SeasonWeights } from '../../../lib/season-weights';
import type { ElementConfig } from '../../../lib/settings';
import { getSizeScale, getSpeedScale } from './index';
import { getElementDescriptor } from './elements';

/* 区间随机 */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/* 从数组随机取一个 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* 按元素类型构造一个粒子实例（已应用大小/速度缩放与随机参数） */
export function createElement(
  type: string,
  width: number,
  height: number,
  sizeScale: number,
  speedScale: number,
  weights: SeasonWeights,
): Particle {
  const desc = getElementDescriptor(type);
  if (!desc) throw new Error(`未知粒子元素: ${type}`);

  if (desc.behavior === 'twinkle') {
    const sMin = desc.sizeRange.min * sizeScale;
    const sMax = desc.sizeRange.max * sizeScale;
    const regionY = desc.target?.region === 'top-third' ? height / 3 : height;
    const tw = desc.twinkleSpeedRange ?? { min: 0.8, max: 3.0 };
    const op = desc.opacityRange ?? { min: 0.5, max: 1.0 };
    return new TwinklingParticle({
      type,
      x: Math.random() * width,
      y: Math.random() * regionY,
      size: rand(sMin, sMax),
      color: desc.color ?? '#FFFAD6',
      speedY: 0,
      rotation: 0,
      rotSpeed: 0,
      opacity: 1,
      wobblePhase: 0,
      wobbleSpeed: 0,
      wobbleAmp: 0,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: rand(tw.min, tw.max),
      baseOpacity: rand(op.min, op.max),
    });
  }

  const sizeMin = desc.sizeRange.min * sizeScale;
  const sizeMax = desc.sizeRange.max * sizeScale;

  let color = desc.color ?? '#FFFFFF';
  if (desc.palettes) {
    const seasons = desc.seasons ?? Object.keys(desc.palettes);
    const parts = seasons
      .map((s) => ({ s, w: weights[s as keyof SeasonWeights] ?? 0 }))
      .filter((p) => p.w > 0);
    const total = parts.reduce((a, p) => a + p.w, 0);
    if (total > 0) {
      let r = Math.random() * total;
      let chosen = parts[0].s;
      for (const p of parts) {
        if (r < p.w) {
          chosen = p.s;
          break;
        }
        r -= p.w;
      }
      const pal = desc.palettes[chosen] ?? desc.palettes[seasons[0]];
      if (pal && pal.length) color = pick(pal);
    }
  }

  const speed = desc.speedRange ?? { min: 10, max: 30 };
  const wob = desc.wobbleSpeedRange ?? { min: 0.4, max: 1.2 };
  const amp = desc.wobbleAmpRange ?? { min: 10, max: 30 };
  const rot = desc.rotationSpeedRange ?? { min: 0, max: 0 };
  const op = desc.opacityRange ?? { min: 0.5, max: 1.0 };

  return new FallingParticle({
    type,
    x: Math.random() * width,
    y: -20 - Math.random() * height,
    size: rand(sizeMin, sizeMax),
    speedY: rand(speed.min, speed.max) * speedScale,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: rand(rot.min, rot.max),
    opacity: rand(op.min, op.max),
    color,
    wobblePhase: Math.random() * Math.PI * 2,
    wobbleSpeed: rand(wob.min, wob.max),
    wobbleAmp: rand(amp.min, amp.max),
  });
}
