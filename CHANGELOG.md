# Changelog

本项目所有重要变更均记录于此文件。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- **用户自定义元素零代码生效**：粒子系统全面数据驱动，新增元素只需在 `entrypoints/envir/particle/elements.json` 增加一条目（含 `behavior` / `render` 几何 / 各参数范围 / `label` / `icon` / `seasons`），运行期与弹窗自动识别，无需改动任何 TypeScript
- 新增 `envir/particle/elements.ts`（元素描述符类型、元素类型列表、访问器、季节权重计算）与 `envir/particle/factory.ts`（数据驱动粒子工厂 `createElement`）
- `getElementConfigs(settings)`：按当前 `elements.json` 的元素列表聚合各元素配置（缺省回退默认），供 content.ts 与 popup 统一使用
- **逐粒子故障隔离**：`ParticleManager.step()` 对每个粒子的 `update`/`draw` 独立 `try/catch`，单个粒子异常仅移除该粒子，绝不中断渲染循环或波及其他粒子；错误日志设数量上限（`MAX_ERROR_LOGS=20`）避免刷屏，`clear()` 时重置计数。生成环节（`spawnStep`/`maintainTwinkles`）同样对 `createElement` 做防御性兜底，避免坏元素描述符无限抛错

### Changed
- `lib/settings.ts`：`Settings.particles` 由固定 `{leaf,snow,star}` 改为 `Record<string, ElementConfig>` 索引签名，支持任意元素类型
- `envir/particle/index.ts`：`getStarMaxCount()` 改名 `getTwinkleMaxCount()`（适配任意 twinkle 元素）；新增 `getTwinkleTarget(desc, hour, max)`（通用 twinkle 目标数量，跨午夜以午夜为峰值）；re-export 元素访问器
- `envir/particle/manager.ts`：`spawnStep()` 遍历所有 fall 行为元素（各自累加器、按 `seasons` 季节权重门控）；`maintainStars()` 升级为 `maintainTwinkles()`，遍历所有 twinkle 行为元素按各自 `target` 维持数量
- 删除手写 `envir/leaf`、`envir/snow`、`envir/star` 三个模块（生成逻辑统一收归 `factory.ts` 数据驱动）
- Popup 粒子页改为**按 `elements.json` 动态生成**各元素分组（速度/大小/数目控件）；twinkle 元素自动隐藏速度项

### Fixed
- 修复 `content.ts` 动画循环 `particleManager.step()` 被调用两次导致粒子每帧更新与绘制两遍（等效飘落速度翻倍）的问题，现为单次调用

## [0.6.0] - 2026-10-13

### Changed
- 代码结构整理：将 `entrypoints/content.ts` 中的渲染逻辑按职责拆分到 `entrypoints/envir/` 各分类目录
  - `envir/leaf`：叶子颜色、尺寸范围、生成与绘制
  - `envir/snow`：雪花尺寸范围、生成与绘制
  - `envir/star`：星光常量、生成、目标数量计算、绘制与数量调整
  - `envir/halo`：夏季镜头炫光（封装为 `LensFlare` 类）
  - `envir/light`：时段亮度计算与亮度遮罩层更新
  - `envir/particle`：飘落粒子类型、数目/大小设置映射与逐帧生成逻辑
  - `envir/intensity`：显示程度 → 强度系数映射
- `entrypoints/content.ts` 精简为统一的调度入口（编排各 `envir` 模块），`entrypoints/README.md` 未改动

## [0.5.0] - 2026-06-21

### Added
- 星光功能：夜间（19 点至次日 5 点）在屏幕上方 1/3 区域显示黄白色闪烁星光
- `STAR_MAX_COUNT` 和 `STAR_SIZE_RANGE` 常量
- `Star` 接口及 `stars` 数组字段
- `getStarTargetCount()` 函数：19-23 点递增，0 点最多，1-5 点递减至 0
- `createStar()` 在屏幕上方 1/3 区域生成星光
- `updateStars()` 调整数量：增加时保留原有添加新的，减少时随机删除
- `drawStar()` 黄白色径向渐变（中心黄白 → 边缘朦胧），带闪烁效果
- 星光数量及透明度受显示程度影响

## [0.4.0] - 2026-06-19

### Changed
- 季节自定义月份：按钮网格（1-12 月 4×3）改为进度条滑块，显示"X月"
- 时间自定义小时：按钮网格（1-24 点 6×4）改为进度条滑块，范围改为 0-23，显示"X时"
- 小时体系从 1-24 统一改为 0-23，`TIME_OF_DAY_HOURS.midnight` 从 24 改为 0
- `getTimeBrightness` 去掉 0 点转 24 的逻辑，注释更新为 0-23 体系
- `currentHour` 字段注释从 1-24 改为 0-23

### Removed
- 删除不再使用的 `.custom-month-row`、`.month-grid`、`.hour-grid`、`.month-btn` 样式

## [0.3.1] - 2026-06-18

### Added
- 时间设置功能：支持清晨/上午/中午/下午/傍晚/晚上/深夜预设、自定义小时（0-23 点）、跟随系统时间
- 亮度遮罩层：根据时段调节页面整体亮度（中午最亮，深夜降至 0.7，仍保证可阅读）
- `MIN_BRIGHTNESS` 可调节最低亮度常量（默认 0.7，建议不低于 0.5）
- `TIME_OF_DAY_HOURS` 时段到小时映射常量
- `TIME_OF_DAY_BRIGHTNESS` 时段预设亮度系数
- `getTimeBrightness()` 函数：用余弦曲线在 12 点最亮和 0 点最暗间平滑插值
- `brightnessOverlay` 亮度遮罩 div，z-index 位于色调层和粒子层之间保证粒子可见
- 夏季镜头炫光增加白天判断：仅在 6-18 点显示
- Popup 1-24 小时选择器（6×4 网格）

## [0.3.0] - 2026-06-17

### Added
- 粒子大小设置功能：小/中/大预设及自定义（0-100%）
- `PARTICLE_SIZE_MAP` 预设缩放系数（小=0.6 / 中=1.0 / 大=1.5）
- `LEAF_SIZE_RANGES` 各季节叶子尺寸 Min/Max 常量表
- `SNOW_SIZE_RANGE` 雪花尺寸 Min/Max 变量（之前雪花没有）
- `getParticleSizeScale()` 自定义 0-100% 分段插值（0%→0.3，50%→1.0，100%→1.8）
- 粒子大小缩放同时作用于 Min/Max 边界，保持尺寸范围比例

### Changed
- `createLeaf()` 改为从 `LEAF_SIZE_RANGES` 取尺寸范围，乘以缩放系数
- `createSnow()` 改为用 `SNOW_SIZE_RANGE` 常量，乘以缩放系数

## [0.2.0] - 2026-06-16

### Added
- 粒子数目设置功能：微量/少量/中等/大量预设及自定义（10-1800 个/分钟）
- `PARTICLE_RATE_MAP` 预设值（微量=10 / 少量=20 / 中等=50 / 大量=120 个/分钟）
- `getParticleRate()` 将 个/分钟 转换为 个/秒
- `spawnAccumulator` 累加器机制：按 `dt × particleRate` 逐帧生成粒子
- Popup 新增粒子设置分区（粒子数目 + 粒子大小作为二级选项）
- 新增 `.sub-setting`、`.sub-title` 样式
- 重写 README.md：功能介绍 + 开发与构建
- 增加 Git 提交规范文档 `commit.md`
- README 增加快速开始步骤，提示必须先 `npm install`

### Changed
- 粒子系统从固定同屏数量改为基于生成速率
- 粒子着陆行为以窗口底部为下界，停下后约 2 秒渐隐消失
- 缩小叶子尺寸：春 4-8 / 夏 5-9 / 秋 5-10
- 统一插件名称为 Season Switch

### Removed
- 删除静态堆积系统（`pileCanvas`、`PILE_COUNTS`、`renderPile()`、`drawSnowBank()`）

### Fixed
- 修复 `defineContentScript` 找不到的类型错误（新增 `tsconfig.json`）
- 修复内容脚本崩溃（`onSettingsChanged` 未导入导致运行时为 undefined）
- 修复 `runAt` 类型错误（`'document_idle'` 而非 `'documentIdle'`）
- 季节切换不再清除旧粒子，自然飘落渐隐

## [0.1.0] - 2026-06-15

### Added
- 初始化 WXT 项目，配置 `wxt.config.ts` 及 `storage` 权限
- Popup 设置界面：季节（春/夏/秋/冬/自定义/跟随系统）、时间、显示程度三个设置区块
- 季节自定义月份选择器（1-12 月 4×3 网格）
- 设置通过 `chrome.storage.local` 持久化存储
- 共享设置模块 `lib/settings.ts`
- 季节权重插值 `lib/season-weights.ts`（交界月份线性插值，如 3 月春 0.7 + 夏 0.3）
- 内容脚本 `entrypoints/content.ts` 核心渲染：
  - 色彩覆盖层：根据权重混合四季色调，极低透明度
  - 飘落粒子系统：Canvas + requestAnimationFrame
    - 春：嫩绿小叶子，贝塞尔曲线绘制 + 叶脉
    - 夏：深绿叶子（数量少），附带镜头炫光
    - 秋：金黄/枯黄叶子
    - 冬：球状雪花，径向渐变（白心→朦胧边）
  - 镜头炫光（夏）：CSS 径向渐变，位于右上区域
  - 设置变更实时响应（`chrome.storage.onChanged`）
  - DPR 适配，窗口 resize 处理
- 显示程度功能：朦朦/浅/中/深/自定义，作用于色彩层透明度、镜头炫光、粒子绘制透明度
