// ✨ 镜头炫光（夏季光晕）相关
// 当夏权重足够且为白天（6-18 点）时在右上区域显示暖色光晕。

import type { SeasonWeights } from '../../../lib/season-weights';

// 夏季镜头炫光管理：根据季节权重与时段创建/更新/移除光晕元素
export class LensFlare {
  private el: HTMLDivElement | null = null;

  // 根据当前设置更新光晕的显示与透明度
  update(weights: SeasonWeights, intensity: number, currentHour: number): void {
    const isDaytime = currentHour >= 6 && currentHour <= 18;
    const show = weights.summer > 0.3 && isDaytime;

    if (show) {
      if (!this.el) {
        this.el = document.createElement('div');
        Object.assign(this.el.style, {
          position: 'fixed',
          top: '5vh',
          right: '10vw',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,255,200,0.25) 0%, rgba(255,240,150,0.08) 35%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: '2147483646',
          filter: 'blur(15px)',
          transition: 'opacity 1.2s ease',
        });
        document.documentElement.appendChild(this.el);
      }
      this.el.style.opacity = String(weights.summer * intensity * 0.6);
    } else if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }

  // 移除光晕元素（清理时调用）
  remove(): void {
    this.el?.remove();
    this.el = null;
  }
}
