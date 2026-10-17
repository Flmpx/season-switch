/*
 * 交互特效：hover 光标跟随光斑 + 点击灰色波纹。
 * 通过事件委托挂在 popup 根节点上，不侵入各页面模块。
 *
 * 光斑（hover）：作用于 .row / .option-btn / .back。
 *   mousemove 时把光标相对元素左上角的坐标写入 --mx / --my，
 *   CSS 用 radial-gradient 在坐标处画柔光，仅 :hover 时可见，跟随光标。
 *
 * 波纹（click）：仅作用于 .option-btn（点了不翻页的选项按钮）。
 *   按钮被点击后由页面逻辑立即置为 .active（白底黑字），本模块在点击点
 *   生成一个灰色圆，按按钮对角线尺寸放大扩散并淡出；
 *   灰色介于白底与界面底色 #3c3c3c 之间。
 *   切换页面的 .row 与返回 .back 不挂波纹——一点就滑走新页面，波纹看不到。
 */

const SPOTLIGHT = '.row, .option-btn, .back';
const RIPPLE = '.option-btn';

export function initEffects(root: HTMLElement): void {
  // 光标跟随光斑：仅更新当前 hover 到的元素坐标
  root.addEventListener('mousemove', (e) => {
    const host = (e.target as HTMLElement).closest<HTMLElement>(SPOTLIGHT);
    if (!host) return;
    const rect = host.getBoundingClientRect();
    host.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    host.style.setProperty('--my', `${e.clientY - rect.top}px`);
  });

  // 点击波纹：仅 .option-btn，灰色圆从点击点扩散淡出（白底由页面逻辑即时生效）
  root.addEventListener('click', (e) => {
    const host = (e.target as HTMLElement).closest<HTMLElement>(RIPPLE);
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const size = Math.hypot(rect.width, rect.height); // 按对角线，确保放大后能覆盖圆角长方形
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    host.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
    window.setTimeout(() => ripple.remove(), 400); // 兜底：防止 animationend 未触发导致节点残留
  });
}
