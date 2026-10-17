/*
 * Copyright (c) 2026 Flmpx
 * Licensed under MIT (see LICENSE).
 */

// 粒子系统统一出口：类型、注册表、档位、配置、工厂、管理器、渲染器。
export * from './elements';
export * from './presets';
export { registry } from './registry';
export { getElementConfigs, effectiveParticleValue } from './config';
export { getTwinkleTarget } from './target';
export { createElement } from './factory';
export { ParticleManager } from './manager';
export { Particle, FallingParticle, TwinklingParticle } from './particle';
export type { ParticleInit } from './particle';
export { drawParticle } from './renderer';
export type { DrawParticleOpts } from './renderer';
