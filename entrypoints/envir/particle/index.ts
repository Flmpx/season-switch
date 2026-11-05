/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

/** 粒子系统对外出口，供内容脚本、popup、管理页共用 */
export * from './elements';
export * from './presets';
export { registry } from './registry';
export {
  getElementConfigs,
  resolveParticleValue,
  choiceValue,
  defaultParticleValue,
} from './config';
export type { ResolvedValue } from './config';
export { getTwinkleTarget, isVisible } from './target';
export { createElement } from './factory';
export { ParticleManager } from './manager';
export { Particle, TwinklingParticle } from './particle';
export type { ParticleInit } from './particle';
export { drawParticle } from './renderer';
export type { DrawParticleOpts } from './renderer';
export { getImage, preloadAssets, releaseAssets } from './assets';
