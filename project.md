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
- 时间（清晨/上午/...）和显示程度的效果仍未实现
