# Season Switch

在浏览器任意页面显示季节氛围场景的扩展插件。

## 功能介绍

### 季节氛围

在任意网页上叠加淡淡的季节氛围效果，不影响正常浏览，只为增添一份舒适感：

- **春** — 朦胧的绿色色调，飘落嫩绿的小叶子
- **夏** — 略带金黄的阳光色调，镜头炫光，少量深绿叶子
- **秋** — 淡黄色调，金黄与枯黄的叶子飘落
- **冬** — 淡白色调，球状雪花（内白外朦胧）飘落

支持 **自定义月份** 和 **跟随系统时间**，交界月份自动插值过渡（如 3 月春 0.7 + 夏 0.3，12 月冬 0.95 + 春 0.05）。

### 时间

支持清晨、上午、中午、下午、傍晚、晚上、深夜等时段氛围（功能开发中）。

### 粒子

- **粒子数目** — 微量(10/分钟) / 少量(20/分钟) / 中等(50/分钟) / 大量(120/分钟) / 自定义(10~1800个/分钟)
- **粒子大小** — 小 / 中 / 大 / 自定义(0~100%)

### 显示程度

朦朦 / 浅 / 中 / 深 / 自定义(0~100%)

## 开发与构建

### 环境要求

- [Node.js](https://nodejs.org/) 18+ 
- npm（随 Node.js 安装）

### 安装依赖

```bash
npm install
```

### 开发模式

以 Chromium 为目标浏览器运行开发模式（自动监听文件变更并热重载）：

```bash
npm run dev
```

以 Firefox 为目标：

```bash
npm run dev:firefox
```

启动后，在浏览器中加载扩展：

- **Chrome**：打开 `chrome://extensions/`，开启"开发者模式"，点击"加载已解压的扩展程序"，选择 `.output/chrome-mv3-dev` 目录
- **Firefox**：打开 `about:debugging#/runtime/this-firefox`，点击"临时载入附加组件"，选择 `.output/firefox-mv3-dev` 目录下的 manifest 文件

### 构建生产版本

```bash
npm run build
```

构建产物位于 `.output/chrome-mv3` 目录。

### 打包发布

```bash
npm run zip
```

生成 `.zip` 文件位于 `dist/` 目录，可直接提交到 Chrome Web Store 或 Firefox Add-ons。

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（Chromium） |
| `npm run dev:firefox` | 开发模式（Firefox） |
| `npm run build` | 构建生产版本 |
| `npm run build:firefox` | 构建 Firefox 版本 |
| `npm run zip` | 打包 zip |
| `npm run zip:firefox` | 打包 Firefox zip |
