// 🍃❄️ 飘落粒子系统相关
// 数目/大小设置映射（粒子的生成与生命周期见 ./manager）。
// 粒子类型与行为见 ./particle（Particle 基类 + FallingParticle 派生）。

import type { Settings } from '../../../lib/settings';

// 粒子数目预设值 — 每分钟生成粒子数（个/分钟）
// 滑块范围 10~1800，预设值在范围内选取
export const PARTICLE_RATE_MAP: Record<string, number> = {
  minimal: 10, // 微量
  few: 20, // 少量
  medium: 50, // 中等（默认）
  heavy: 120, // 大量
  'custom-particle': 50, // 自定义（实际值由 customParticleCount 字段决定）
};

// 将设置转换为 个/秒 的生成速率
export function getParticleRate(settings: Settings): number {
  let perMinute: number;
  if (settings.particleCount === 'custom-particle') {
    perMinute = settings.customParticleCount;
  } else {
    perMinute = PARTICLE_RATE_MAP[settings.particleCount] ?? 50;
  }
  return perMinute / 60;
}

// 粒子大小预设值 — 尺寸缩放系数（1.0 = 当前默认大小，即"中等"）
// 小=0.6 / 中=1.0 / 大=1.5
export const PARTICLE_SIZE_MAP: Record<string, number> = {
  small: 0.6, // 小
  medium: 1.0, // 中（默认）
  large: 1.5, // 大
  'custom-size': 1.0, // 自定义（实际值由 customParticleSize 字段决定）
};

// 粒子大小缩放系数（1.0 = 中等）
// 自定义 0-100%：0%→0.3, 50%→1.0（中等）, 100%→1.8
// 分段线性插值，保证 50% 恰好为 1.0
export function getParticleSizeScale(settings: Settings): number {
  if (settings.particleSize === 'custom-size') {
    const v = settings.customParticleSize;
    if (v <= 50) {
      return 0.3 + (v / 50) * 0.7; // 0→0.3, 50→1.0
    }
    return 1.0 + ((v - 50) / 50) * 0.8; // 50→1.0, 100→1.8
  }
  return PARTICLE_SIZE_MAP[settings.particleSize] ?? 1.0;
}
