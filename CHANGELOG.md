# Changelog

本项目所有重要变更均记录于此文件。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added
- 图片粒子渲染：新增 `envir/particle/assets`（优先 `<img>`，站点 CSP 拦截时降级为 `createImageBitmap` 静态位图；未就绪则跳过该帧），渲染器接入 `image` 分支（`size` 为高度、宽度按 `aspect` 等比）
- 飘落粒子硬上限 800（超出从最旧淘汰，`setMaxFall()` 可调）
- 元素删除或外观变更时清理在飞粒子（`ParticleManager.sync()`），内容脚本订阅注册表并预加载 / 释放图片资产
- 新增独立管理页 `entrypoints/manager/`（构建为 `manager.html`）：左侧固定侧边栏（新建粒子 / 我的粒子）+ 右侧内容区，hash 路由（`#/new`、`#/mine`、`#/detail/<id>`）刷新保持页面
- 管理页三视图：新建粒子（左侧表单 + 右侧 180×180 实时预览）、我的粒子（内置 / 自定义分组、行内二次确认删除、JSON 导入导出）、详情（改动即时落盘；内置元素写 `overrides` 且可「恢复默认」；删除需二次确认）
- SVG 导入 `manager/svg-import.ts`：`path` / `rect` / `circle` / `ellipse` / `line` / `polyline` / `polygon` 统一转路径，按 `viewBox` 归一化到 `[-1, 1]`，`<text>` 与渐变降级给出提示
- 路径渲染支持仿射矩阵（`PathSpec.matrix` + `ctx.transform`），导入的圆弧、椭圆、旋转无需数值近似
- 四类外观编辑器：SVG 文件 / 粘贴代码、图片（自动测量宽高比并写入资产库）、emoji（预设格子 + 手输）、文字（字体 / 字重 / 颜色）
- 管理页交互：所有可点元素 hover 光标跟随光斑，分段按钮与 emoji 格子点击泛起波纹，表单分组 260ms 高度过渡折叠
- popup 粒子页标题栏右侧新增「+」，与左侧「返回」对称；已打开管理页时复用该标签并跳到「新建粒子」，没有才新建

### Changed
- 数据契约重构：`Settings.particles` 由"档位枚举 + 自定义百分比"改为按元素 id 存的速度/大小/数目数值，旧字符串值自动丢弃
- `elements.json` 改为 `speedPresets` / `sizePresets` / `countPresets` / `motion`（单值 + jitter）/ `defaults`；`countPresets` 从死字段变为生效档位，删除 `target.max`
- 新增元素注册表 `registry`（内置 + 用户库 + 内置覆盖 三层合并），粒子管线改为遍历注册表
- 新增 `lib/element-store`（用户元素库 CRUD / 校验 / 导入导出）与 `lib/asset-store`（dataURL 资产去重）
- 渲染器改为接收外观描述符 `render`（svg / image / emoji / text），不再自行读取 `elements.json`
- Popup 元素页改为"档位按钮 + 自定义数值滑块"，非档位值显示「自定义」
- 内容脚本应用设置前校验注册表就绪；销毁时先退订回调再清理
- 管理页所有数值字段改为滑块（范围统一由 `elements.ts` 的 `NUMERIC_LIMITS` 提供），档位值同样以滑块编辑
- 数值读取层增加夹取：注册表三条合并路径统一过 `clampDescriptor`，`effectiveParticleValue` 读取 `settings.particles` 时再夹一次，手改存储或导入 JSON 也不会出现越界值
- 渲染器 emoji / 文字外观支持旋转（此前只平移，视觉上始终静止）

### Fixed
- 修复 `atmo-overlay` 防重复注入守卫从未生效
- 修复 `ParticleManager.clear()` 从未被调用
- 修复图片资产晚于元素写入存储时粒子永久不可见（预加载失败允许重试）
- 修复粒子故障日志在单页生命周期内最多只输出 20 条（改为每 60s 窗口限流）
- 修复窗口缩小后不可见粒子长期占用飘落粒子上限（增加左右边界回收）
- 修复 popup 点「自定义」展开滑块后弹窗高度不更新（多出的行被 `.pages` 的 `overflow: hidden` 裁掉）
- 修复 popup 粒子条目过多时被 flex 压扁而不滚动（正文块改为不可收缩，超出部分内部滚动）
- 修复管理页内容被限宽 920px 导致右侧大面积空白
- 修复管理页表单五个分组之间没有间隙（`.form` 缺少布局规则）
- 移除管理页「返回」按钮的箭头装饰

## [0.8.0] - 2026-10-17

### Changed
- 设置入口由独立网页回退为 popup 弹窗，采用 iOS 式导航栈：点主选项从右滑入二级页、旧页左滑出，返回时当前页右滑出、父页从左滑入；多级下钻（粒子 → 元素）同样适用，弹窗高度随内容自适应（非固定）
- Popup 视觉统一为暗色主题（背景 `#3c3c3c`、文字 `#e8e8e8`、选中项白底黑字）
- 代码注释规范化（popup 部分）：结构成员行尾 `//` 注释、函数上方 `/* */` 功能注释，移除函数体遗留注释

### Added
- 选项按钮交互特效：hover 时光标跟随淡白光斑；点击立即白底黑字并自点击点泛起灰色波纹扩散淡出（切页行与返回按钮不挂波纹）

### Docs
- 新增 `docs/page.md`：最终弹窗界面设计（导航栈、暗色主题、交互特效、自适应高度、模块化文件结构）
- `README.md` 文档列表补充 `docs/page.md` 链接

## [0.7.0] - 2026-10-14

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

### Docs
- 删除零散的 `design.md` / `commit.md` / `log.md` / `find.md` 与 `entrypoints/README.md`，改为新建 `docs/` 目录：
  - `docs/design.md`：大重构后的整体设计（分层结构 + mermaid 架构图/数据流向图 + 特例说明，如星光跨午夜、twinkle 无速度项、数据驱动零代码新增元素、故障隔离）
  - `docs/art.md`：按当前实现重写的美术设计（季节色调、时间亮度、叶子/雪花/星光外观、夏季光晕、显示程度、自定义元素美术约定）
- 代码注释规范化：类/结构体成员一律 `//` 行尾注释，成员函数统一 `/* */` 函数上方注释，移除函数体内遗留注释；中文、简洁
- 更新首页 `README.md`：粒子改为按元素（叶子/雪花/星光）独立设置速度/大小/数目，补充「自定义元素零代码」说明，末尾新增文档链接（design.md / art.md）

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
