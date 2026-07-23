# Season Switch — 开发文档（entrypoints 篇）

> 目标：让新接手的人（或另一段对话 / 另一个 AI）在几分钟内理解本项目结构，并能直接动手开发。
> 配套总文档见根目录 `README.md`（功能介绍、环境要求、构建发布），以及 `design.md`（需求设计）、`CHANGELOG.md`（版本变更）。

---

## 1. 这是什么

Season Switch 是一个**浏览器扩展**：在任意网页上叠加一层淡淡的季节 / 时间氛围（色彩、飘落粒子、亮度、星光、光晕），不影响正常浏览。

技术栈：**WXT** 框架 + TypeScript + 原生 Canvas（无前端框架）。最小权限，设置存于 `chrome.storage.local`。

两条运行时主线：

1. **内容脚本 `content.ts`** —— 注入到每个网页，负责所有画面渲染（动画循环）。
2. **弹窗 `popup/`** —— 设置界面，只做一件事：读写 `Settings` 并持久化。

两者通过 `lib/settings.ts` 解耦：弹窗 `saveSettings()` 写存储 → 内容脚本 `onSettingsChanged()` 监听 → `applySettings()` 实时更新画面。

---

## 2. 目录结构

```
entrypoints/
├── content.ts            # 内容脚本入口：注入 DOM 层 + 动画循环，编排下方所有 envir 模块
├── README.md             # 本文件
├── popup/                # 设置弹窗（纯静态 HTML + TS，无框架）
│   ├── index.html        # 界面结构：每个设置项是一个 .option-grid，自定义项用 slider
│   ├── main.ts           # 读取设置、绑定 UI、保存设置（直接 mutate 一个 Settings 对象后 save）
│   └── style.css         # 弹窗样式（深色主题，宽 320px）
└── envir/                # 氛围渲染模块，按职责拆分，content.ts 统一调用
    ├── intensity/        # 显示程度 → 强度系数（影响色调/粒子/星光/光晕浓度）
    ├── particle/         # 飘落粒子系统：FallingParticle 类型、数目/大小映射、逐帧生成
    ├── leaf/             # 叶子：颜色色板、尺寸范围、createLeaf、drawLeaf
    ├── snow/             # 雪花：尺寸范围、createSnow、drawSnow
    ├── star/             # 星光：常量、createStar、getStarTargetCount、updateStars、drawStar
    ├── halo/             # 夏季镜头炫光（封装为 LensFlare 类，自管 DOM）
    └── light/            # 时段亮度：getTimeBrightness、updateBrightnessOverlay、时段映射常量

lib/                      # 共享逻辑（被 content 与 popup 共用）
├── settings.ts           # Settings 接口 / DEFAULT_SETTINGS / load / save / onSettingsChanged
└── season-weights.ts     # SeasonWeights 接口 / getSeasonWeights（交界月份线性插值）
```

**分层 z-index（数字越大越靠上）：**

| 层级 | 元素 | z-index |
|------|------|---------|
| 最底 | 雾气/色调覆盖层 `overlay`（季节色调） | `2147483645` |
| 中   | 亮度遮罩 `brightnessOverlay` / `LensFlare` 光晕 | `2147483646` |
| 最顶 | 粒子 Canvas（`leaf`/`snow`/`star` 都在这里画） | `2147483647` |

> 关键约定：**粒子永远画在最顶层 Canvas 上**，色调层与亮度遮罩在它下面，所以粒子始终可见。

---

## 3. 数据流向（读懂这条线，就懂了 80%）

```
                Settings (lib/settings.ts)
                 │  load / save / onChanged
        ┌────────┴─────────┐
   popup/main.ts        content.ts
   写设置              读设置 → applySettings()
                          │
            ┌─────────────┼──────────────────────┐
       getSeasonWeights   getIntensityValue    getTimeBrightness
       (lib/season-*)     (envir/intensity)    (envir/light)
            └─────────────┴──────────────────────┘
                 计算出 weights / intensity / timeBrightness / particleRate ...
                          │
              AtmosphereRenderer 持有这些状态，在 animate() 中：
                • spawnParticles() 生成 leaf/snow
                • updateStars() 调整星光数量
                • drawLeaf / drawSnow / drawStar 逐帧绘制
                • lensFlare.update() / updateBrightnessOverlay() 更新 DOM 层
```

`content.ts` 本身只做**编排**：持有状态、跑动画循环、把参数传给各 `envir/*` 的纯函数。所有"属性与绘制细节"都在 `envir/` 各模块里。

---

## 4. 关键模块速查

### `lib/settings.ts` — 设置的唯一真相源
- `interface Settings`：所有可配置项（见下）。
- `DEFAULT_SETTINGS`：默认值（季节/时间默认"跟随系统"，强度/粒子默认"中"）。
- `loadSettings()` / `saveSettings(s)` / `onSettingsChanged(cb)`：基于 `chrome.storage.local`。

`Settings` 字段一览：

| 字段 | 取值 | 说明 |
|------|------|------|
| `season` | `spring`/`summer`/`autumn`/`winter`/`custom-season`/`system-season` | 季节 |
| `customMonth` | 1–12 | 自定义季节月份 |
| `timeOfDay` | `dawn`/`morning`/`noon`/`afternoon`/`dusk`/`evening`/`midnight`/`custom-time`/`system-time` | 时间 |
| `customHour` | 0–23 | 自定义小时 |
| `intensity` | `misty`/`light`/`medium`/`deep`/`custom-intensity` | 显示程度 |
| `customIntensity` | 0–100 | 自定义强度 |
| `particleCount` | `minimal`/`few`/`medium`/`heavy`/`custom-particle` | 粒子数目 |
| `customParticleCount` | 10–1800（个/分钟） | 自定义数目 |
| `particleSize` | `small`/`medium`/`large`/`custom-size` | 粒子大小 |
| `customParticleSize` | 0–100 | 自定义大小 |

### `lib/season-weights.ts` — 四季权重
`getSeasonWeights(season, customMonth)` 返回 `{spring, summer, autumn, winter}`（各 0~1，和为 1）。
- 固定季节：对应权重为 1。
- `custom-season` / `system-season`：按月份查 `MONTH_WEIGHTS` 表，**交界月份自动插值**（如 3 月 = 春 0.7 + 夏 0.3）。
- 想调季节过渡手感 → 改 `MONTH_WEIGHTS` 表即可。

### `entrypoints/content.ts` — 编排入口
`AtmosphereRenderer` 类：
- 构造时创建 3 个 DOM 层（overlay / brightnessOverlay / canvas）并挂到 `document.documentElement`；
- `applySettings()`：计算出全部派生状态（weights / intensity / rate / size / brightness / currentHour），更新各层；
- `animate()`：`requestAnimationFrame` 循环，更新+绘制粒子、生成新粒子、更新+绘制星光；
- `handleResize()`：按 `devicePixelRatio` 适配 Canvas；
- `destroy()`：清理监听与 DOM（扩展卸载时由 `ctx.onInvalidated` 触发）。

### `entrypoints/envir/*` 模块 API（content.ts 调用方）

| 模块 | 主要导出 | 用途 |
|------|----------|------|
| `intensity` | `getIntensityValue(s)` → number | 显示程度 → 强度系数 |
| `particle` | `FallingParticle`(类型), `getParticleRate(s)`, `getParticleSizeScale(s)`, `spawnParticles(...)` → number（累加器） | 粒子系统核心 |
| `leaf` | `LEAF_COLORS`, `LEAF_SIZE_RANGES`, `createLeaf(w,h,scale,weights)`, `drawLeaf(ctx,x,y,size,color,angle,opacity)` | 叶子 |
| `snow` | `SNOW_SIZE_RANGE`, `createSnow(w,h,scale)`, `drawSnow(ctx,x,y,size,opacity)` | 雪花 |
| `star` | `STAR_MAX_COUNT`, `STAR_SIZE_RANGE`, `Star`(类型), `getStarTargetCount(hour,max)`, `createStar(w,h)`, `updateStars(stars,hour,intensity,w,h)`, `drawStar(ctx,star,intensity)` | 星光 |
| `halo` | `class LensFlare`：`update(weights,intensity,hour)` / `remove()` | 夏季光晕 |
| `light` | `TIME_OF_DAY_HOURS`, `MIN_BRIGHTNESS`, `TIME_OF_DAY_BRIGHTNESS`, `getTimeBrightness(s)`, `updateBrightnessOverlay(div,brightness)` | 亮度 |

> 模块间依赖：`particle` 会 `import` `leaf`/`snow` 的 `create*` 来生成粒子；`leaf`/`snow` 仅以 `import type` 引用 `particle` 的 `FallingParticle` 类型（避免运行时循环依赖）。其它模块相互独立。

---

## 5. 开发示例：新增一个氛围模块（以「雾气 Fog」为例）

这是本项目**最典型的扩展方式**：新建一个 `envir/<name>/index.ts`，暴露纯函数或一个自管 DOM 的小类，然后在 `content.ts` 里接三处（持有实例 → `applySettings` 更新 → `destroy` 清理）。

### 步骤 1：新建 `entrypoints/envir/fog/index.ts`

> 约定：DOM 相关效果推荐做成"自管 DOM 的小类"（参考已有的 `LensFlare`），与 `content.ts` 解耦。

```ts
import type { SeasonWeights } from '../../../lib/season-weights';

// 雾气：春/秋清晨更浓，叠加一层半透明白雾
export class Fog {
  private el: HTMLDivElement | null = null;

  // 在 applySettings 时调用；所有"是否显示 + 浓度"的判断都收在这里
  update(weights: SeasonWeights, intensity: number, currentHour: number): void {
    const isMorning = currentHour >= 5 && currentHour <= 9;
    // 春/秋权重越高、且是清晨 → 雾越浓
    const fogAmount = (weights.spring + weights.autumn) * (isMorning ? 1 : 0.3);
    const opacity = Math.min(0.5, fogAmount * intensity * 0.4);

    if (opacity > 0.02) {
      if (!this.el) {
        this.el = document.createElement('div');
        Object.assign(this.el.style, {
          position: 'fixed',
          inset: '0',
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: '2147483644', // 在色调层之下
          background: 'rgba(220,225,230,1)',
          transition: 'opacity 1.2s ease',
        });
        document.documentElement.appendChild(this.el);
      }
      this.el.style.opacity = String(opacity);
    } else if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }

  remove(): void {
    this.el?.remove();
    this.el = null;
  }
}
```

### 步骤 2：在 `content.ts` 接入三处

```ts
import { Fog } from './envir/fog';

class AtmosphereRenderer {
  // 1) 持有实例（与 lensFlare 同级）
  private fog = new Fog();

  private applySettings(settings: Settings) {
    // ... 既有逻辑 ...
    this.fog.update(this.weights, this.intensity, this.currentHour); // 2) 更新
  }

  private destroy() {
    // ... 既有清理 ...
    this.fog.remove(); // 3) 清理
  }
}
```

完成。新效果会随设置变化实时出现/消失，且扩展卸载时自动清理。**无需改动 `lib`、无需改动弹窗**——因为它复用了已有的 season/intensity/hour 设置。

---

## 6. 若要新增一个「设置项」（全链路）

当现有效果不够、需要新设置键时，改动点按数据流向依次是：

1. **`lib/settings.ts`**：在 `Settings` 接口加字段，并在 `DEFAULT_SETTINGS` 给默认值。
2. **`entrypoints/popup/index.html`**：在对应 `<section>` 加一个 `.option-grid`（按钮）或一个 `.custom-row`（滑块）。
   - 按钮组靠 `data-key="你的键"` + 每个按钮 `data-value="..."` 驱动；`main.ts` 已通用化处理，新按钮组**无需改 JS**。
   - 自定义滑块则需要：在 `main.ts` 加 `getElementById` 引用 + 一个 `updateXxxSlider()` + 一个 `initXxxSlider()`（复制现有 `initSlider` 模式改字段名即可）。
3. **`entrypoints/content.ts`**：在 `applySettings()` 里读取新字段，计算出派生状态并交给对应 `envir` 模块。

> 提示：弹窗的 `initOptionGrids()` 通过 `data-key` 直接 `(settings as any)[key] = value` 并 `saveSettings()`，所以**纯按钮选项零代码**即可接入存储。

---

## 7. 常见修改点速记

| 想做的事 | 改哪里 |
|----------|--------|
| 调季节过渡手感（哪个月偏哪个季节） | `lib/season-weights.ts` 的 `MONTH_WEIGHTS` |
| 改叶子/雪花颜色、尺寸 | `envir/leaf` (`LEAF_COLORS` / `LEAF_SIZE_RANGES`)、`envir/snow` (`SNOW_SIZE_RANGE`) |
| 改深夜最暗程度 | `envir/light` 的 `MIN_BRIGHTNESS`（建议 ≥ 0.5） |
| 改显示程度档位对应浓度 | `envir/intensity` 的 `INTENSITY_MAP` |
| 改粒子数目/大小档位 | `envir/particle` 的 `PARTICLE_RATE_MAP` / `PARTICLE_SIZE_MAP` |
| 改星光最大数量/尺寸/出现时段 | `envir/star` 的 `STAR_MAX_COUNT` / `STAR_SIZE_RANGE` / `getStarTargetCount` |
| 加全新氛围效果 | 新建 `envir/<name>/index.ts`，按第 5 节接入 `content.ts` |
| 加新设置键 | 按第 6 节改 `settings.ts` → `popup` → `content.ts` |
| 改弹出界面外观 | `popup/style.css`（宽 320px，深色主题） |

---

## 8. 本地运行与调试

```bash
npm install        # 首次必须，会执行 wxt prepare 生成类型声明
npm run dev        # 开发模式（Chromium），文件变更热重载
```

加载扩展：
- Chrome：`chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选 `.output/chrome-mv3-dev`
- Firefox：`about:debugging#/runtime/this-firefox` → 临时载入 → 选 `.output/firefox-mv3-dev/manifest.json`

调画面时直接在网页里看效果；`content.ts` 的 `console.log` 会在网页的 DevTools 控制台输出。`npm run build` 用于产出生产包（`.output/chrome-mv3`），`npm run zip` 打包发布。

> 注意：`content.ts` 通过 `defineContentScript({ matches: ['<all_urls>'], runAt: 'document_idle' })` 注入；调试时若页面已打开，改完代码热重载后刷新页面即可。
