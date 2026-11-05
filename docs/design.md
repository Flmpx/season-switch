# 设计文档（Season Switch）

> 本文说明本次「粒子数值化 + 用户自定义元素 + 独立管理页」重构后的整体设计（简要）。
> 界面设计见 [`page.md`](./page.md)，美术与观感见 [`art.md`](./art.md)。

## 1. 设计目标

- **四种外观走同一条绘制路径**：SVG 路径、图片、emoji、文字都抽象成一处「外观描述」，渲染器只认 `render` 字段，不关心它是内置元素还是用户自建的。
- **用户可扩展而不改代码**：管理页里造元素、传图、导入导出 JSON，运行期与弹窗自动识别。
- **数值即真相**：速度是 `px/s`、大小是 `px`、数量是「个」或「个/分钟」。档位（慢 / 中 / 快）只是描述符里的一组常用值，不再是数据模型里的枚举。
- **出问题只影响自己**：单个粒子异常不影响其他粒子；越界数值在读取层就被夹住，手改存储或导入 JSON 也不会让粒子瞬间飞出屏幕。

## 2. 分层结构

```mermaid
flowchart TD
    subgraph entry["入口层 entrypoints/"]
        CS["content.ts\n(内容脚本)"]
        POP["popup/\n设置弹窗"]
        MGR["manager/\n管理页"]
        RM["region-modal\n(区域框选)"]
    end

    subgraph coord["协调层"]
        AR["AtmosphereRenderer\n(每帧驱动)"]
    end

    subgraph part["环境层 envir/particle/"]
        REG["registry\n(三层合并)"]
        ELS["elements.ts + elements.json\n(描述符 + 数值上限)"]
        CFG["config\n(生效值)"]
        FAC["factory\n(造粒子)"]
        MNG["manager\n(生命周期)"]
        PCL["particle.ts\n(粒子类)"]
        REN["renderer\n(四种外观)"]
        AST["assets\n(图片解码)"]
        PRE["presets\n(档位/单位/滑块)"]
        TGT["target\n(星光时段曲线)"]
    end

    subgraph env["环境层 envir/"]
        INT["intensity"]
        LGT["light"]
        HALO["halo"]
    end

    subgraph lib["共享层 lib/"]
        SET["settings\n(设置 + 数值)"]
        ES["element-store\n(用户库/覆盖)"]
        AS["asset-store\n(图片资产)"]
        SW["season-weights"]
        ICO["icons\n(线性图标)"]
    end

    CS --> AR
    AR --> REG
    AR --> CFG
    AR --> INT
    AR --> LGT
    AR --> HALO
    AR --> MNG
    AR --> SW
    MNG --> FAC
    MNG --> TGT
    MNG --> PCL
    FAC --> REG
    PCL --> REN
    REN --> AST
    REN --> ELS
    REG --> ELS
    REG --> ES
    CFG --> SET
    CFG --> ELS
    POP --> SET
    MGR --> ES
    MGR --> AS
    MGR --> PRE
    MGR --> RM
    MGR --> ICO
    POP --> ICO
    ES --> AS
```

## 3. 关键模块职责

| 模块 | 职责 |
| --- | --- |
| `entrypoints/content.ts` | 内容脚本入口与协调者：注入三层固定 DOM（色调 / 亮度 / 粒子），`await registry.init()` 后每帧驱动 `spawnStep` / `maintainTwinkles` / `step`，订阅设置与元素库变更。自身不含粒子物理。 |
| `envir/particle/registry.ts` | 元素注册表：内置 → 用户库 → 内置覆盖三层合并，订阅 `chrome.storage.onChanged` 自动重建，对外提供 `list` / `get` / `subscribe` / `isReady`。 |
| `envir/particle/elements.ts` + `elements.json` | 描述符契约与内置数据，另有 `NUMERIC_LIMITS`（全部数值字段的合法区间）与 `clampDescriptor`（越界夹取）。 |
| `envir/particle/presets.ts` | 速度 / 大小 / 数量三根轴的档位标签、单位、步长、滑块上限，以及 `axisPresets`（读描述符里的档位数组）。 |
| `envir/particle/config.ts` | 把档位选择与 `settings.particles[id]` 合成「当前生效值」（`resolveParticleValue`），并再夹一次区间。 |
| `envir/particle/target.ts` | 星光按时段的数量曲线，含 `TWINKLE_FLOOR` 保底。 |
| `envir/particle/factory.ts` | 按描述符造粒子：抖动、随机取色（按季节权重选调色板）、区域落位。 |
| `envir/particle/particle.ts` | 粒子数据类：位置 / 速度 / 相位 / 区域下边界，外加一个指向 `render` 的指针；`TwinklingParticle` 覆写更新与绘制。 |
| `envir/particle/manager.ts` | 生命周期总控：按元素累加器生成、按时段与季节门控、统一更新与绘制、800 颗硬上限、边界回收、`sync()` 丢弃已失配的在飞粒子、逐粒子故障隔离。 |
| `envir/particle/renderer.ts` | 唯一绘制入口：处理四种外观、仿射矩阵、描边宽度补偿。 |
| `envir/particle/assets.ts` | 图片资产解码与缓存：优先 `<img>`（GIF 会动），被 CSP 拦截时降级 `createImageBitmap`。 |
| `lib/settings.ts` | `Settings` 类型与存储读写；`particles` 为「元素 id → 三轴选择」（档位下标或自定义数值）。 |
| `lib/element-store.ts` | 用户元素库的增删改查、校验、导入导出，以及内置元素的覆盖字段（overrides）。 |
| `lib/asset-store.ts` | 图片以 dataURL 存 `chrome.storage.local`，按内容哈希去重，单张上限 512 KB。 |
| `lib/season-weights.ts` | 月份 → 四季权重插值（3 月 = 春 0.7 + 夏 0.3）。 |
| `lib/icons.ts` | 21 个 `24×24` 内联 SVG 线性图标，界面里替代 emoji。 |
| `envir/intensity` / `light` / `halo` | 显示程度、时段亮度、夏季镜头炫光。 |
| `popup/` | 快速设置弹窗：季节 / 时间 / 显示程度 / 每个元素的三根轴。 |
| `manager/` | 管理页（独立标签页）：新建 / 我的粒子 / 详情，含实时预览、区域框选与 JSON 导入导出。 |
| `manager/region-modal.ts` | 出现区域的框选遮罩（管理页内，shadow DOM 隔离）。 |
| `manager/fields.ts` | 表单控件工厂，其中 `createTrack` 是单圆点/多圆点共用的自绘滑块。 |

## 4. 数据模型

### 4.1 三处存储（`chrome.storage.local`）

| 键 | 内容 | 写入方 |
| --- | --- | --- |
| `settings` | 季节 / 时间 / 显示程度 + `particles: Record<元素 id, { speed: AxisChoice; size: AxisChoice; count: AxisChoice }>` | popup、管理页详情页 |
| `userLibrary` | `{ version: 2, elements: 用户元素[], overrides: 内置覆盖 }` | 管理页（新建 / 详情 / 导入） |
| `asset:<id>` | `{ id, mime, dataUrl, bytes, aspect }`（`bytes` 是文件原始字节数） | 管理页上传图片 |

`AxisChoice` 是 `{ kind: 'preset'; index } | { kind: 'custom'; value }`：前者记住"选中的是第几档"，后者存用户拖出来的连续数值。分开存，元素档位日后调整时不会把旧数值误当成档位。
`settings.schemaVersion` 与 `userLibrary.version` 都是 `2`；读到旧版本（数值型三件套或 `version: 1`）时整体丢弃、回落到各轴中间档，不写迁移代码。

### 4.2 元素描述符（`ElementDescriptor`）

| 字段 | 说明 |
| --- | --- |
| `id` / `source` / `label` / `icon` | 唯一标识（用户元素前缀 `u_`）、来源（内置 / 用户）、显示名、列表图标 |
| `behavior` | `fall` 飘落 / `twinkle` 闪烁 |
| `seasons` | 参与哪些季节；空数组表示全年（星光即如此） |
| `render` | 外观，四种之一（见 4.3） |
| `color` | 固定颜色，颜色选择器作用于此 |
| `palettes` | 按季节权重取色的色板（内置叶子用；用户元素可选） |
| `motion` | `jitter` / `wobbleSpeed` / `wobbleAmp` / `rotationSpeed` / `opacity` / `twinkleSpeed` |
| `presets` | 三根轴的档位数组：`{ speed, size, count }`，空数组表示该轴不设档位（如星光的速度） |
| `region` | 出现区域，`{ x, y, w, h }` 全是 `0–1` 的窗口比例 |
| `visible` | 出现时段，`{ from, to, wrap }`：`from`/`to` 是 `0–24` 的小时，`wrap` 表示时段跨午夜 |

三根轴的初始值不再单独存字段：新建元素时自动取各轴档位的**中间档**（长度 3 取下标 1，长度 4 取下标 2），写入 `settings.particles[id]`。

### 4.3 四种外观

- `{ kind: 'svg', paths: [{ d, fill, stroke, matrix? }] }`：路径在 `[-1, 1]` 归一化空间绘制；`fill` 可为 `{ mode: 'solid', source: 'particle' | 'constant', color? }` 或 `{ mode: 'radial', stops }`；`matrix` 为导入 SVG 时保留的仿射变换。
- `{ kind: 'image', assetId, aspect }`：高度取 `size`，宽度 `size × aspect`（夹在 0.1~10）。
- `{ kind: 'emoji', glyph }`：`fillText`，字号 = `size`。
- `{ kind: 'text', text, fontFamily, fontWeight, color }`：同上，但带字体与颜色。

### 4.4 数值区间（`NUMERIC_LIMITS`）

| 字段 | 区间 | 步长 |
| --- | --- | --- |
| `speed` | 0 – 200 px/s | 1 |
| `size` | 1 – 120 px | 0.5 |
| `count`（飘落） | 0 – 360 个/分钟 | 1 |
| `count`（闪烁） | 0 – 300 个 | 1 |
| `jitter` | 0 – 1 | 0.01 |
| `wobbleSpeed` | 0 – 5 | 0.1 |
| `wobbleAmp` | 0 – 80 px | 1 |
| `rotationSpeed` | −3 – 3 rad/s | 0.05 |
| `opacity` | 0 – 1 | 0.01 |
| `twinkleSpeed` | 0 – 10 | 0.1 |
| `hour` | 0 – 24 点 | 0.5 |
| `region` | 0 – 1（窗口比例） | 0.01 |
| `aspect` | 0.1 – 10 | 0.1 |

UI 滑块与读取层共用这一份定义：滑块负责不让用户手滑，读取层负责挡住手改存储与导入的 JSON。

## 5. 数据流

### 5.1 启动

```mermaid
sequenceDiagram
    participant C as content.ts
    participant R as registry
    participant E as element-store
    participant A as assets
    participant S as settings
    C->>R: init()
    R->>E: loadUserLibrary()
    R->>R: 三层合并 builtin → user → overrides
    C->>R: subscribe(变更回调)
    C->>A: preloadAssets(图片元素的 assetId)
    C->>S: loadSettings()
    C->>C: applySettings() → 权重 / 强度 / 配置 / 亮度 / 光晕
    C->>C: animate() 每帧循环
```

### 5.2 变更传播

- **改设置**（popup 或管理页详情）→ `settings` 键变化 → 内容脚本 `applySettings` 重算权重、显示程度、各元素生效值。
- **改元素库**（新建 / 编辑 / 删除 / 导入）→ `userLibrary` 键变化 → `registry.rebuild` → 内容脚本 `sync()` 立即丢弃失配的在飞粒子、补载图片资产（失败的允许重试）、重算配置；管理页与弹窗各取所需。
- **改单元素**（详情页）对用户元素写 `userLibrary.elements`，对内置元素只写 `userLibrary.overrides`，因此内置元素不会被"复制"一份。

### 5.3 每帧

```mermaid
sequenceDiagram
    participant A as AtmosphereRenderer
    participant M as ParticleManager
    A->>M: spawnStep(dt, 当前小时, 季节权重, 宽, 高, 配置)
    A->>M: maintainTwinkles(当前小时, 显示程度, 配置)
    A->>M: step(dt, 宽, 显示程度)
    M->>M: 每粒子 update/draw（各自 try/catch）
```

`step` 不再接收高度：每个粒子自带 `bottom`（出现区域下边界换算成的像素），落到自己的区域底部就停下渐隐，而不是落到整页底部。

## 6. 关键取舍

| 取舍 | 结论 | 原因 |
| --- | --- | --- |
| 档位枚举 vs 数值 | 以数值为准，档位只是常用值 | 自定义不需要「百分比」这种中间单位；迁移到别的元素/别的机器时 `px/s` 直观；管理页滑块直接编辑真实数值 |
| 用户库存放位置 | `chrome.storage.local` + JSON 导入导出 | 打包内的 `elements.json` 是只读资源，运行期不可写；storage 在 `unlimitedStorage` 下足够放图片 |
| 三层合并 | 内置 → 用户 → 覆盖 | 内置元素不可删但可改；覆盖只存与模板不同的字段，内置模板升级后仍能继承新值 |
| SVG 导入方式 | 保留原始 `d`，另附仿射矩阵（`ctx.transform`） | 不引入 `svgpath` 之类的解析依赖（当前环境装不了新包），且弧线、椭圆、旋转都是精确变换而非数值近似 |
| 图片解码 | 先 `<img>`，失败再 `createImageBitmap` | `<img>` 支持 GIF 动画；严格 CSP 站点拦下内联 SVG/图片时用位图兜底 |
| 数值夹取位置 | `NUMERIC_LIMITS` 单一来源，UI 与读取层共用 | 一处改，两边同步；也便于文档与代码对齐 |
| 滑块实现 | 自绘轨道（`createTrack`），不用原生 `input[type=range]` | 原生圆点是伪元素，无法在其上挂数值气泡；自绘后单圆点与多圆点共用一套代码，还能把段位卡位、键盘、aria 一次做全 |
| 出现区域如何选 | 在管理页内盖遮罩框选，不再注入到网页上 | 跨页注入需要内容脚本消息通道、切标签、处理页面卸载，链路长且容易在"用户切走"时留下遮罩；管理页内框选与网页窗口同比例映射，结果等价而链路短 |
| 界面主题 | 白底卡片 + 单一强调色 `#4a7bd8` | 氛围类插件的界面不该抢画面；浅色也更接近系统设置页的观感 |
| 代码组织 | 每个页面 / 视图独立成文件，允许重复 | 单文件即可看懂一个界面；用户明确要求"模块化、允许代码重复" |

## 7. 特例与注意事项

- **星光（star）是 `twinkle` 行为**：静态不动，没有速度轴（`axisVisible` 返回 `false`），弹窗自动隐藏「速度」；「数量」含义是**峰值颗数**而非「个/分钟」。
- **跨午夜时段**：`visible.from = 19`、`visible.to = 5`、`wrap = true`。为避免 19:00 整"一颗都没有"，`getTwinkleTarget` 用 `TWINKLE_FLOOR = 0.25` 保底，入夜与黎明都保留约 25% 峰值数量。
- **只有内置叶子按季节取色**：颜色由 `palettes` 按季节权重加权随机；其他元素只用 `seasons` 决定"出不出现"。用户元素同样可以填 `palettes`，但管理页目前没有开放该字段。
- **绘制约定**：SVG 路径在 `[-1, 1]` 空间、按 `size` 缩放；图片高度 = `size`、宽度 = `size × aspect`；emoji / 文字用 `fillText`，字号 = `size`。四种外观都居中绘制，emoji 与文字也支持旋转。
- **描边宽度补偿**：`lineWidth = widthPx / (size × scale)`，粒子放大缩小时描边的视觉粗细保持不变。
- **上限与回收**：飘落粒子硬上限 800 颗（超限淘汰最旧）；飘出左右各 120px 的粒子立即回收，缩窗后不会长期占名额。
- **故障隔离**：`step()` 内每个粒子的更新与绘制各自 `try/catch`，异常只移除该粒子；错误日志按 60 秒时间窗限流（每窗最多 20 条）。
- **图层层级**：色调层 `z-index: 2147483645`，亮度层与夏季炫光 `2147483646`，粒子画布 `2147483647`，保证粒子始终可见。
- **会话小时是小数**：内容脚本每帧算一次 `小时 + 分钟 / 60`，亮度、粒子出现时段、星光曲线共用这一个值，所以 `23:30` 不会因为按整点取整而当成 `23:00`；`wrapHour` 负责把滑块的 `24` 折算成 `0`。
- **内置元素锁两处**：外观与「基础」（名称 / 图标 / 行为）都只读，展开后只显示一句说明；可改的是出现、运动、档位，改动写进 `overrides`，「恢复默认」清空它。
- **预览不参与季节**：预览画布按 `size` 画单颗粒子、演示运动，不计算季节权重，所以内置叶子在预览里显示为白色（真机上按季节取色）。
- **预览不裁边**：预览把绘制尺寸压到画布的 72%（`SPRITE = 52`、摆动上限 `12px`），图片类再把宽高比夹在 `0.5 ~ 2`，保证任何旋转角都不会被画布边缘裁出直边。
- **已知限制**：严格 CSP 站点下 GIF 会退化为首帧、内联 SVG 可能解码失败；导出的 JSON **不含**图片资产（`asset:*` 键不在其中），换环境导入后图片元素会静默不显示。
