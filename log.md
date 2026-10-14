# 项目开发日志

## 2026-06-15 初始化项目 & 完成插件设置界面

### 完成内容

1. **初始化 WXT 项目**
   - 使用 WXT (v0.20.26) 作为浏览器扩展开发框架
   - 配置 `wxt.config.ts`，声明扩展名称"氛围场景"及 `storage` 权限
   - 安装依赖并验证构建通过

2. **实现 Popup 设置界面**
   - 界面分三个设置区块，对应 `process.md` 中定义的功能：
     - **季节**：春、夏、秋、冬、自定义、跟随系统
     - **时间**：清晨、上午、中午、下午、傍晚、晚上、深夜、自定义、跟随系统
     - **显示程度**：朦朦、浅、中、深、自定义（选择自定义时展示百分比滑块 0~100%）
   - 点击按钮即选中，高亮显示当前选项
   - 设置通过 `chrome.storage.local` 持久化存储，重新打开 popup 自动恢复上次选择
   - 深色主题 UI，适配 320px 宽度的 popup 窗口

### 文件结构

```
tool-free/
├── wxt.config.ts              # WXT 构建配置 & manifest
├── package.json               # 依赖管理
├── entrypoints/
│   └── popup/
│       ├── index.html          # Popup 页面结构
│       ├── style.css           # 深色主题样式 & 选中态动画
│       └── main.ts             # 设置读写逻辑 (chrome.storage)
├── README.md                   # 项目简介
├── process.md                  # 功能需求定义
└── project.md                  # 本文件 - 开发日志
```

### 备注

- 页面内的氛围场景悬浮窗效果**尚未实现**，当前仅完成设置面板
- 各设置项的"自定义"选项目前仅保留入口，具体的自定义时间选择器等交互待后续实现

---

## 2026-06-15 实现季节氛围悬浮效果

### 完成内容

1. **新建 `lib/settings.ts` — 共享设置模块**
   - 提取 `Settings` 接口为 popup 和 content script 共用
   - 新增 `customMonth` 字段（1-12），供季节"自定义"使用
   - 导出 `loadSettings()` / `saveSettings()` / `onSettingsChanged()` 工具函数

2. **新建 `lib/season-weights.ts` — 季节权重插值**
   - 定义 `MONTH_WEIGHTS[1-12]` 常量，每月到四季的权重映射
   - 交界月份线性插值：3月=春0.7+夏0.3，10月=秋0.5+冬0.5，12月=冬0.95+春0.05
   - `getSeasonWeights()` 根据设置返回当前四季权重

3. **新建 `entrypoints/content.ts` — 内容脚本（核心渲染）**
   - 使用 `defineContentScript` 注入到所有页面
   - **色彩覆盖层**：CSS div，根据权重混合四季色调（绿/金/黄/蓝白），极低透明度
   - **飘落粒子系统**：Canvas + requestAnimationFrame
     - 春：嫩绿小叶子 ~20片，贝塞尔曲线绘制 + 叶脉
     - 夏：深绿叶子 ~10片（数量少），附带镜头炫光
     - 秋：金黄/枯黄叶子 ~20片
     - 冬：球状雪花 ~25片，径向渐变（白心→朦胧边）
   - **底部堆积**：离屏 canvas 预渲染，叶子随机散布 / 雪堆正弦曲线轮廓
   - **镜头炫光（夏）**：CSS 径向渐变，位于右上区域，缓慢飘移
   - 设置变更实时响应（`chrome.storage.onChanged`），季节切换时旧粒子自然消失
   - DPR 适配，窗口 resize 处理，`ctx.onInvalidated` 清理

4. **更新 Popup — 月份选择器**
   - 季节选"自定义"后展开 1-12 月选择器（4×3 网格）
   - 选择月份保存至 `settings.customMonth`
   - popup/main.ts 改为从共享 `lib/settings.ts` 导入类型

### 文件结构

```
tool-free/
├── wxt.config.ts
├── package.json
├── lib/
│   ├── settings.ts              # 共享设置类型 & 存储工具
│   └── season-weights.ts        # 月份→四季权重插值
├── entrypoints/
│   ├── content.ts                # 内容脚本 — 氛围渲染
│   └── popup/
│       ├── index.html            # Popup（新增月份选择器）
│       ├── style.css             # Popup 样式（新增月份按钮样式）
│       └── main.ts               # Popup 逻辑（使用共享 settings）
├── README.md
├── process.md
└── project.md
```

### 备注

- 时间（清晨/上午/...）和显示程度的效果暂未实现，设置面板可操作但无页面效果
- 季节"自定义"的自定义时间选择器已实现（月份 1-12）

---

## 2026-06-16 修复氛围场景不显示 & 粒子系统优化

### 完成内容

1. **修复 `defineContentScript` 找不到的类型错误**
   - 根目录缺少 `tsconfig.json`，IDE 无法解析 WXT 自动生成的全局类型声明
   - 新建 `tsconfig.json`，内容为 `{"extends": "./.wxt/tsconfig.json"}`

2. **修复内容脚本崩溃导致氛围不显示**
   - `content.ts` 中调用了 `onSettingsChanged` 但未从 `../lib/settings` 导入，运行时为 `undefined` 直接报错崩溃
   - 补充导入：`import { loadSettings, onSettingsChanged, type Settings } from '../lib/settings'`

3. **修复 `runAt` 类型错误**
   - WXT v0.20.26 的 `runAt` 要求 Chrome API 枚举值 `'document_idle'`（下划线），而非 `'documentIdle'`（驼峰）
   - 已修正为 `'document_idle'`

4. **粒子着陆行为 — 以窗口底部为下界**
   - 叶子/雪花到达窗口底边时停下（`speedY=0`），不再越过底部
   - 停下后约2秒内渐隐消失，配合底部静态堆积层形成"堆积但不高"的效果

5. **删除静态堆积系统**
   - 移除 `pileCanvas`、`PILE_COUNTS`、`renderPile()`、`drawSnowBank()` 及动画中绘制 pile 的代码
   - 底部不再有静态不动的叶子堆和雪堆

6. **季节切换不再清除旧粒子**
   - 删掉 `updateParticles()` 中把多余粒子强制设为 `opacity=0` 的逻辑
   - 旧季节的叶子/雪花自然飘落到底部渐隐，新季节粒子叠加出现

7. **缩小叶子尺寸**
   - 飘落叶子：春 4-8 / 夏 5-9 / 秋 5-10（之前 6-12 / 8-14 / 8-16）
   - 堆积叶子：3-9（之前 5-14，后随堆积系统一起移除）

8. **增加粒子数量**
   - 最终数量：春55 / 夏30 / 秋55 / 冬70
   - 演变过程：20/10/20/25 → 30/15/30/40 → 40/20/40/55 → 55/30/55/70

9. **添加关键参数注释**
   - 为 `LEAF_COLORS`、`SEASON_TINTS`、`PARTICLE_COUNTS`、`INTENSITY_MAP` 等常量添加中文注释
   - 为 `createLeaf()` / `createSnow()` 中的尺寸、速度、摇摆幅度等属性添加注释
   - 为雪花渐变、叶脉绘制、着陆渐隐速度等添加注释

### 文件结构

```
tool-free/
├── wxt.config.ts
├── tsconfig.json                 # 新增 — 继承 .wxt/tsconfig.json，修复类型识别
├── package.json
├── lib/
│   ├── settings.ts              # 共享设置类型 & 存储工具
│   └── season-weights.ts        # 月份→四季权重插值
├── entrypoints/
│   ├── content.ts                # 内容脚本 — 氛围渲染（已优化粒子系统）
│   └── popup/
│       ├── index.html
│       ├── style.css
│       └── main.ts
├── README.md
├── process.md
└── project.md
```

### 备注

- 时间（清晨/上午/...）和显示程度的效果暂未实现，设置面板可操作但无页面效果
- 底部静态堆积已移除，粒子到达底部后自然渐隐

---

## 2026-06-16 增加粒子数目设置功能

### 完成内容

1. **Popup 新增粒子设置分区**
   - 粒子作为一级选项，粒子数目和粒子大小作为二级选项
   - 粒子数目：微量 / 少量 / 中等 / 大量 / 自定义
   - 选择"自定义"时展开进度条滑块（10~1800 个/分钟），单位显示为"X个/分钟"
   - 新增 `.sub-setting`、`.sub-title` 样式，二级标题更小更淡

2. **粒子大小设置入口（UI 已添加，功能未实现）**
   - 小 / 中 / 大 / 自定义（选择自定义时展开百分比滑块 0~100%）

3. **`lib/settings.ts` 新增字段**
   - `particleCount`：字符串选项（`minimal` / `few` / `medium` / `heavy` / `custom-particle`），默认 `medium`
   - `customParticleCount`：数字，自定义粒子数目（个/分钟），默认 50
   - `particleSize`：字符串选项（`small` / `medium` / `large` / `custom-size`），默认 `medium`
   - `customParticleSize`：数字，自定义粒子大小百分比，默认 50

4. **内容脚本粒子系统改为基于生成速率**
   - 删除旧的 `PARTICLE_COUNTS`（固定同屏数量）和 `updateParticles()` / `replenishParticles()`
   - 新增 `PARTICLE_RATE_MAP`：预设值 微量=10 / 少量=20 / 中等=50 / 大量=120（个/分钟）
   - 新增 `getParticleRate()` 函数：读取设置值（个/分钟），除以 60 转换为 个/秒
   - 新增 `spawnAccumulator` 累加器机制：每帧按 `dt × particleRate` 累加，每积累1个粒子就生成一个
   - 生成粒子按季节权重随机分配叶子或雪花
   - 改变粒子数目时已在飘落的粒子不受影响，仅改变新生成速率

### 文件结构

```
tool-free/
├── wxt.config.ts
├── tsconfig.json
├── package.json
├── lib/
│   ├── settings.ts              # 新增 particleCount / customParticleCount / particleSize / customParticleSize
│   └── season-weights.ts
├── entrypoints/
│   ├── content.ts                # 粒子系统改为基于生成速率
│   └── popup/
│       ├── index.html            # 新增粒子分区（粒子数目+粒子大小）
│       ├── style.css             # 新增 sub-setting / sub-title 样式
│       └── main.ts               # 新增粒子数目/大小交互逻辑
├── README.md
├── process.md
└── project.md
```

### 备注

- 粒子大小设置 UI 已完成，功能效果未实现
- 时间（清晨/上午/...）的效果仍未实现

---

## 2026-06-16 重写 README.md 项目文档

### 完成内容

1. **重写 README.md**
   - 增加功能介绍部分：季节氛围（春/夏/秋/冬及插值过渡）、时间、粒子（数目+大小）、显示程度
   - 增加开发与构建部分：环境要求（Node.js 18+）、安装依赖、开发模式、构建生产版本、打包发布
   - 增加 Chrome 和 Firefox 加载扩展的详细步骤
   - 增加可用脚本命令表格（dev / build / zip 等）

### 备注

- 插件名称统一为 Season Switch
- 插件重命名和 commit.md 的增加已在前序提交完成

---

## 2026-06-16 README 增加快速开始步骤

### 完成内容

1. **README 开发与构建章节优化**
   - 合并"安装依赖"和"开发模式"为"快速开始"章节
   - 明确标注 clone 后必须先执行 `npm install`，否则会报 `wxt is not recognized` 错误
   - 补充说明 `npm install` 会自动执行 `wxt prepare` 生成类型声明

### 备注

- 原因：clone 后没有 `node_modules` 目录，`wxt` 命令不在 PATH 中，必须先安装依赖

---

## 2026-06-17 增加粒子大小设置功能

### 完成内容

1. **新增粒子大小常量表**
   - 新增 `PARTICLE_SIZE_MAP`：预设缩放系数 小=0.6 / 中=1.0 / 大=1.5
   - 新增 `LEAF_SIZE_RANGES`：将各季节叶子尺寸 Min/Max 从 `createLeaf` 内联提取为常量表（春 4-8 / 夏 5-9 / 秋 5-10）
   - 新增 `SNOW_SIZE_RANGE`：为雪花新增尺寸 Min/Max 变量（3-10），之前雪花没有 Min/Max 变量

2. **新增 `getParticleSizeScale()` 函数**
   - 自定义 0-100% 分段线性插值：0%→0.3、50%→1.0（中等）、100%→1.8
   - 保证 50% 恰好为 1.0，与"中等"预设一致

3. **`AtmosphereRenderer` 类集成粒子大小**
   - 新增 `particleSizeScale` 字段，`applySettings` 中调用 `getParticleSizeScale` 更新
   - `createLeaf()` 改为从 `LEAF_SIZE_RANGES` 取尺寸范围，乘以缩放系数得到实际 min/max
   - `createSnow()` 改为用 `SNOW_SIZE_RANGE` 常量，乘以缩放系数得到实际 min/max

4. **设计原则**
   - 以当前默认尺寸为"中等"（缩放系数 1.0）
   - 缩放系数同时改变 Min 和 Max 两个边界，保持尺寸范围的宽度比例
   - 不同季节粒子大小本来就不同，各自独立缩放
   - 已在飘落的粒子不受影响，仅新生成粒子按新尺寸生成

### 文件结构

```
tool-free/
├── wxt.config.ts
├── tsconfig.json
├── package.json
├── lib/
│   ├── settings.ts
│   └── season-weights.ts
├── entrypoints/
│   ├── content.ts                # 新增粒子大小缩放系统
│   └── popup/
│       ├── index.html
│       ├── style.css
│       └── main.ts
├── README.md
├── process.md
└── project.md
```

### 备注

- 粒子大小设置 UI 在前序提交中已完成，本次补齐功能效果
- 时间（清晨/上午/...）和显示程度的效果仍未实现

---

## 2026-06-18 增加时间设置功能

### 完成内容

1. **`lib/settings.ts` 新增 `customHour` 字段**
   - 数字类型，范围 1-24，供时间"自定义"使用
   - 默认值取当前系统小时（`new Date().getHours() || 24`，0 点视为 24 点）

2. **`entrypoints/content.ts` 新增时间亮度系统**
   - 新增 `TIME_OF_DAY_HOURS` 常量：时段到 24 小时映射（清晨=6、上午=10、中午=12、下午=15、傍晚=18、晚上=21、深夜=24）
   - 新增 `MIN_BRIGHTNESS` 常量（默认 0.7）：**可调节的最低亮度系数**，带注释说明不应低于 0.5 以免影响网页阅读
   - 新增 `TIME_OF_DAY_BRIGHTNESS` 常量：时段预设亮度系数（中午=1.0 最亮，深夜=0.7 最暗）
   - 新增 `getTimeBrightness()` 函数：预设时段直接返回对应亮度；自定义时间/跟随系统时用余弦曲线在 12 点（最亮 1.0）和 0/24 点（最暗 MIN_BRIGHTNESS）之间平滑插值
   - 新增 `brightnessOverlay` div 作为亮度遮罩层，z-index 位于色调层（2147483645）和粒子层（2147483647）之间（2147483646），保证粒子始终可见
   - 新增 `updateBrightnessOverlay()` 方法：通过黑色 rgba 透明度（`1.0 - timeBrightness`）降低页面整体亮度
   - 新增 `currentHour` 字段（1-24），在 `applySettings` 中根据设置计算
   - `updateLensFlare()` 增加白天判断：仅在 `currentHour` 为 6-18 且夏权重 > 0.3 时显示镜头炫光
   - `destroy()` 中清理 `brightnessOverlay`

3. **Popup 新增自定义时间选择器**
   - `popup/index.html` 新增 1-24 小时选择器（6×4 网格，复用 `month-btn` 样式，新增 `hour-btn` class）
   - `popup/main.ts` 新增 `updateHourSelector()` 函数：选择"自定义"时展开小时网格
   - `popup/main.ts` 新增 `initHourGrid()` 函数：绑定小时按钮点击事件，保存至 `settings.customHour`
   - `popup/style.css` 新增 `.hour-grid` 样式：6 列布局容纳 24 个按钮

### 文件结构

```
tool-free/
├── wxt.config.ts
├── tsconfig.json
├── package.json
├── lib/
│   ├── settings.ts              # 新增 customHour 字段
│   └── season-weights.ts
├── entrypoints/
│   ├── content.ts                # 新增时间亮度系统、亮度遮罩层、白天镜头炫光判断
│   └── popup/
│       ├── index.html            # 新增 1-24 小时选择器
│       ├── style.css             # 新增 hour-grid 6 列样式
│       └── main.ts               # 新增 updateHourSelector / initHourGrid
├── README.md
├── process.md
└── project.md
```

### 备注

- 最低亮度可通过修改 `MIN_BRIGHTNESS` 常量调节（建议 0.5-0.8 之间）
- 亮度遮罩层位于色调层和粒子层之间，粒子始终可见
- 夏季镜头炫光现在受时间限制，仅白天显示

---

## 2026-06-19 季节月份和时间小时改为进度条选择器

### 完成内容

1. **Popup 季节自定义改为进度条**
   - `popup/index.html` 月份按钮网格（1-12 月 4×3 布局）替换为进度条滑块（min=1, max=12），右侧显示"X月"
   - `popup/main.ts` 新增 `customMonthSlider` / `customMonthValue` DOM 引用
   - `popup/main.ts` `updateMonthSelector` 改为设置滑块值和文本
   - `popup/main.ts` 新增 `initMonthSlider` 绑定 input 事件
   - 删除旧的 `initMonthGrid` 按钮网格绑定函数

2. **Popup 时间自定义改为进度条**
   - `popup/index.html` 小时按钮网格（1-24 点 6×4 布局）替换为进度条滑块，范围改为 **0-23**（符合 design.md 要求），右侧显示"X时"
   - `popup/main.ts` 新增 `customHourSlider` / `customHourValue` DOM 引用
   - `popup/main.ts` `updateHourSelector` 改为设置滑块值和文本
   - `popup/main.ts` 新增 `initHourSlider` 绑定 input 事件
   - 删除旧的 `initHourGrid` 按钮网格绑定函数

3. **小时范围从 1-24 改为 0-23 的同步改动**
   - `lib/settings.ts` `customHour` 注释改为 0-23，默认值去掉 `|| 24` 转换
   - `entrypoints/content.ts` `TIME_OF_DAY_HOURS.midnight` 从 24 改为 0，与 0-23 体系一致
   - `entrypoints/content.ts` `getTimeBrightness` 去掉 0 点转 24 的逻辑，注释更新为 0-23 体系
   - `entrypoints/content.ts` `currentHour` 字段注释从 1-24 改为 0-23
   - `entrypoints/content.ts` `applySettings` 中 system-time 去掉 `|| 24` 转换

4. **样式清理**
   - `popup/style.css` 删除不再使用的 `.custom-month-row`、`.month-grid`、`.hour-grid`、`.month-btn` 及其 hover/active 样式

### 文件结构

```
tool-free/
├── wxt.config.ts
├── tsconfig.json
├── package.json
├── lib/
│   ├── settings.ts              # customHour 范围改为 0-23
│   └── season-weights.ts
├── entrypoints/
│   ├── content.ts                # 时间小时体系改为 0-23
│   └── popup/
│       ├── index.html            # 月份和小时改为进度条
│       ├── style.css             # 删除 month-grid / hour-grid 等样式
│       └── main.ts               # 月份和小时改为进度条交互
├── README.md
├── design.md
├── process.md
└── project.md
```

### 备注

- 季节月份进度条范围 1-12，时间小时进度条范围 0-23（0 时 = 深夜）
- design.md 中明确要求时间自定义单位格式为"15时、0时、23时"
- 旧的月份/小时按钮网格样式已全部清理

---

## 2026-06-21 增加星光功能并发布 v0.5.0

### 完成内容

1. **星光功能实现**
   - 新增 `STAR_MAX_COUNT` 常量（24 点最大星光数 60）和 `STAR_SIZE_RANGE`（1-3 像素）
   - 新增 `Star` 接口：位置、尺寸、闪烁相位/频率、基础透明度
   - 新增 `getStarTargetCount()` 函数：19-23 点线性递增，0 点最大，1-5 点线性递减至 0
   - 新增 `createStar()`：在屏幕上方 1/3 区域随机生成
   - 新增 `updateStars()`：增加时保留原有添加新的，减少时随机删除多余
   - 新增 `drawStar()`：黄白色径向渐变（中心 `rgba(255,250,220,1.0)` → 中间淡黄 → 边缘透明），带闪烁效果（正弦波调制透明度）
   - 星光数量及绘制透明度受显示程度 `intensity` 影响
   - animate 循环中调用 `updateStars` 调整数量并更新闪烁相位、绘制

2. **文档更新**
   - README.md 时间部分增加星光功能说明
   - design.md 更新星光设计细节（黄白色、由内到外朦胧、闪烁、上方 1/3 区域）

3. **发布 v0.5.0**
   - `package.json` 和 `package-lock.json` 版本号从 0.4.0 升至 0.5.0
   - CHANGELOG.md 新增 0.5.0 版本条目

### 文件结构

```
tool-free/
├── wxt.config.ts
├── tsconfig.json
├── package.json                 # 版本号升至 0.5.0
├── package-lock.json            # 版本号升至 0.5.0
├── lib/
│   ├── settings.ts
│   └── season-weights.ts
├── entrypoints/
│   ├── content.ts                # 新增星光系统
│   └── popup/
│       ├── index.html
│       ├── style.css
│       └── main.ts
├── README.md                     # 时间部分增加星光说明
├── design.md                     # 更新星光设计
├── CHANGELOG.md                  # 新增 0.5.0 条目
├── process.md
└── project.md
```

### 备注

- 星光仅在 19 点至次日 5 点显示，0 点最多
- 星光样式类似雪花但颜色为黄白色，由内到外慢慢变得朦胧
- 星光数量增加时保留原有，减少时随机删除，符合 design.md 设计
- 显示程度影响星光最大数量及绘制透明度

---

## 2026-10-13 第六步：粒子设置改为按元素分别配置

> 对应重构计划第 6 步：Settings 改为按元素（leaf / snow / star）分别设置；并补上此前缺失的粒子速度调节。

### 完成内容

1. **`lib/settings.ts` 粒子设置结构化**
   - 移除全局的 `particleCount` / `customParticleCount` / `particleSize` / `customParticleSize`
   - 新增 `ElementConfig` 接口：`speed` / `customSpeed` / `size` / `customSize` / `count` / `customCount`
   - `Settings.particles` 下分 `leaf` / `snow` / `star` 三个独立 `ElementConfig`
   - 速度/大小预设含义：`slow=0.5` / `normal=1.0` / `fast=1.8`；大小 `small=0.6` / `medium=1.0` / `large=1.5`
   - 数目：叶子/雪花为 个/分钟（微量=10 / 少量=20 / 中等=50 / 大量=120）；星光为午夜最大个（微量=15 / 少量=30 / 中等=60 / 大量=120）

2. **`envir/particle/index.ts` 按元素映射**
   - 移除 `getParticleRate()` / `getParticleSizeScale()` 与 `PARTICLE_RATE_MAP` / `PARTICLE_SIZE_MAP`
   - 新增 `getSpeedScale(cfg)` / `getSizeScale(cfg)` / `getCountPerMinute(cfg)` / `getStarMaxCount(cfg)`
   - 新增 `SPEED_SCALE_MAP` / `SIZE_SCALE_MAP` / `COUNT_RATE_MAP` / `STAR_MAX_COUNT_MAP`
   - 自定义值（0-100）分段线性插值，50% 恰好为 1.0（与"中"预设一致）

3. **`envir/particle/manager.ts` 按元素生成与维持**
   - `spawnStep()` 改为 leaf / snow 两个独立累加器，各自按 `getCountPerMinute()` 速率生成，仅在对应季节权重 > 0 时生成
   - 生成时传入 `getSizeScale()` / `getSpeedScale()` 给 `createLeaf` / `createSnow`
   - `maintainStars()` 接收 `starCfg`，用 `getStarMaxCount()` 决定午夜最大数量（取代原 `STAR_MAX_COUNT` 常量）
   - `clear()` 同步重置两个累加器

4. **`create*` 函数增加缩放参数**
   - `createLeaf(w,h,sizeScale,speedScale,weights)`：下落速度 `speedY` 乘以 `speedScale`
   - `createSnow(w,h,sizeScale,speedScale)`：同上
   - `createStar(w,h,sizeScale)`：尺寸范围乘以 `sizeScale`（星光静止，无速度）
   - `envir/star` 移除不再使用的 `STAR_MAX_COUNT` 常量

5. **`entrypoints/content.ts` 编排更新 + 修复重复 step**
   - 移除 `particleRate` / `particleSizeScale` 字段，改为持有 `leafConfig` / `snowConfig` / `starConfig`
   - `applySettings()` 直接读取 `settings.particles.*`
   - `animate()` 改为 `spawnStep(dt, weights, w, h, leaf, snow)` → `maintainStars(...)` → 单次 `step(...)`；**修复此前 `step()` 被调用两次导致粒子每帧更新+绘制两遍（等效飘落速度翻倍）的 bug**

6. **Popup 粒子页重构为按元素分组**
   - `popup/index.html`：粒子面板改为 🍃叶子 / ❄️雪花 / ⭐星光 三个 `.element-setting` 块
   - 每个元素含 速度 / 大小 / 数目 三组控件（星光无速度项）；自定义滑块用 `data-element` / `data-prop` / `data-unit` 驱动
   - `popup/main.ts`：移除旧的全局粒子滑块逻辑，改为通用 `initParticleGrids()` / `initParticleSliders()`，按 `settings.particles[el][prop]` 读写
   - `popup/style.css`：新增 `.element-setting` / `.element-title` 样式（分组分隔 + 标题）

7. **文档同步**
   - `CHANGELOG.md`：Unreleased 新增 Added / Changed / Fixed 条目
   - `entrypoints/README.md`：Settings 字段表、粒子/star 模块 API 表、常见修改点表更新为按元素映射

### 文件结构

```
lib/
└── settings.ts              # 粒子设置改为 particles.{leaf,snow,star} 的 ElementConfig
entrypoints/
├── content.ts                # 持有 particles.* 配置；animate 单次 step（修复重复调用）
└── envir/
    ├── particle/
    │   ├── index.ts          # 按元素映射：getSpeedScale / getSizeScale / getCountPerMinute / getStarMaxCount
    │   └── manager.ts         # spawnStep 双累加器；maintainStars 接收 starCfg
    ├── leaf/index.ts          # createLeaf 增加 speedScale
    ├── snow/index.ts          # createSnow 增加 speedScale
    └── star/index.ts          # createStar 增加 sizeScale；移除 STAR_MAX_COUNT
entrypoints/popup/
├── index.html                # 粒子页改为按元素分组（速度/大小/数目）
├── main.ts                   # 通用按元素读写逻辑
└── style.css                 # .element-setting / .element-title
```

### 备注

- 速度默认值 `normal=1.0` 即原基础下落速度；配合 `step()` 重复调用修复，默认观感比旧版明显更慢，回应"飘落速度太快"的反馈。仍嫌快可降到"慢"（0.5×）
- 星光为静止元素，UI 不提供速度项；其 `speed` 字段保留仅为数据结构一致
- 旧版存储中无 `particles` 字段时，`loadSettings()` 经 `{...DEFAULT_SETTINGS, ...data}` 合并自动回退到默认每元素配置，不会崩溃
- 构建验证：`wxt build` 通过（chrome-mv3）


---

## 第七步：用户自定义元素零代码生效（2026-10-14）

### 目标
粒子系统全面数据驱动：新增元素（如花瓣、雨滴、emoji）只需编辑 `entrypoints/envir/particle/elements.json`，运行期（manager）与弹窗（popup）自动识别，无需改动任何 TS。

### 改动
- `elements.json`：为 leaf/snow/star 增加 `label`（中文名）、`icon`（emoji）、`seasons`（出现季节，fall 用）；star 仅加 label/icon
- 新增 `envir/particle/elements.ts`：`ElementDescriptor` / `ElementBehavior` / `Range` 类型；`ELEMENT_TYPES`（取自 JSON 键序）、`getElementDescriptor`、`getElementMeta`、`seasonWeightFor`（按 seasons 聚合季节权重）
- 新增 `envir/particle/factory.ts`：`createElement(type, w, h, sizeScale, speedScale, weights)` 按 `behavior` 构造 `FallingParticle` / `TwinklingParticle`，参数（尺寸/速度/摆动/旋转/透明度/颜色）全部取自描述符范围，与原 createLeaf/createSnow/createStar 行为一致
- `envir/particle/index.ts`：`getStarMaxCount` → `getTwinkleMaxCount`（适配任意 twinkle 元素）；新增 `getTwinkleTarget(desc, hour, max)`（跨午夜以午夜为峰值的通用目标数量，star 行为与原 `getStarTargetCount` 数值完全一致）；新增 `getElementConfigs(settings)`（按 ELEMENT_TYPES 聚合配置，缺省回退默认）；re-export 元素访问器
- `envir/particle/manager.ts`：`spawnStep` 遍历所有 fall 元素（各自累加器 + 按 seasons 季节权重门控）；`maintainStars` → `maintainTwinkles` 遍历所有 twinkle 元素按各自 `target` 维持数量
- `content.ts`：移除 `leafConfig/snowConfig/starConfig`，改用 `getElementConfigs()` 的 `configs` 传给 manager；删除遗留的 `DEFAULT_SETTINGS` 未用导入
- `lib/settings.ts`：`Settings.particles` 由固定 `{leaf,snow,star}` 改为 `Record<string, ElementConfig>` 索引签名
- popup：`index.html` 粒子面板改为 `#particleGroups` 容器；`main.ts` 按 `ELEMENT_TYPES` 动态生成各元素分组（速度/大小/数目；twinkle 自动隐藏速度项；数目滑块按行为区分 个/分钟 与 个，上限 1800/150）
- 删除 `envir/leaf`、`envir/snow`、`envir/star` 三个目录（生成逻辑统一收归 `factory.ts`）

### 备注
- 验证：`wxt build` 通过（chrome-mv3，content.js 17.19 kB）
- 数据驱动后，leaf 尺寸范围由原来"按季节 4-8/5-9/5-10"统一为 JSON 的单一 `sizeRange` 4-10（外观基本一致，更简洁）
- 新元素加入 elements.json 即生效：默认速度/大小/数目走 `DEFAULT_ELEMENT_CONFIG`，首次保存后写入存储
- star 的 twinkle 目标数量公式经 `getTwinkleTarget` 复算与原 getStarTargetCount 完全吻合（0点=max、19/5点=0）

### 修复：晚上7点星光不显示
- 现象：19:00 整星光目标数量曲线处于 0 点（入夜瞬间一颗都没有），用户感知为"星光不见了"
- 根因：非回归，是设计行为——原 getStarTargetCount 在 19 点（7pm）即返回 0，随夜深线性增至午夜峰值；7 点整恰为 0
- 修复：`envir/particle/index.ts` 的 `getTwinkleTarget` 增加 `TWINKLE_FLOOR = 0.25`，窗口两端保留 25% 峰值星量，入夜/黎明即有可见星光（19:00→15、午夜→60、05:00→15）
- 验证：`node` 数值验算 + `wxt build` 通过
