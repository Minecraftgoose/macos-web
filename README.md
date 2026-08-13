# macOS 网页版

<p align="center">
  <img src="apps/headphoto/goose.webp" width="120" alt="Minecraft_goose" style="border-radius: 24px;">
</p>

<p align="center">
  <strong>把 Mac 搬进浏览器 —— 用纯前端技术复刻 macOS 桌面体验的网页版操作系统。</strong>
</p>

<p align="center">
  <a href="https://macos.goose.cc.cd"><img src="https://img.shields.io/badge/Online%20Demo-macos.goose.cc.cd-0071e3?style=for-the-badge" alt="在线体验"></a>
  <a href="https://minecraftgoose.github.io/macos-web"><img src="https://img.shields.io/badge/GitHub%20Pages-Live-34c759?style=for-the-badge" alt="GitHub Pages"></a>
  <a href="https://github.com/Minecraftgoose/macos-web/releases"><img src="https://img.shields.io/badge/Release-GitHub-6e5494?style=for-the-badge" alt="Release"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.25-blue" alt="version">
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="license">
  <img src="https://img.shields.io/badge/platform-Web%20Browser-lightgrey" alt="platform">
  <img src="https://img.shields.io/badge/deploy-Cloudflare%20Pages-orange" alt="deploy">
  <img src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript">
</p>

<p align="center">
  <a href="https://github.com/Minecraftgoose/macos-web/stargazers"><img src="https://img.shields.io/github/stars/Minecraftgoose/macos-web?style=social" alt="stars"></a>
  <a href="https://github.com/Minecraftgoose/macos-web/network/members"><img src="https://img.shields.io/github/forks/Minecraftgoose/macos-web?style=social" alt="forks"></a>
  <a href="https://github.com/Minecraftgoose/macos-web/issues"><img src="https://img.shields.io/github/issues/Minecraftgoose/macos-web" alt="issues"></a>
</p>

<p>
  一个用纯前端技术复刻 macOS 桌面体验的网页版操作系统。包含 Spotlight、Launchpad、终端、控制中心、关于本机等完整的桌面交互，目标是把 macOS 的核心操作逻辑搬到浏览器里。
</p>

<p>
  <sub>本项目与 Apple Inc. 无任何关系，也并非其官方产品。</sub>
</p>

---

## 目录

- [功能特性](#功能特性)
- [内置应用](#内置应用)
- [技术栈](#技术栈)
- [本地运行](#本地运行)
- [部署到 Cloudflare Pages](#部署到-cloudflare-pages)
- [声明](#声明)
- [许可证](#许可证)
- [链接](#链接)

---

## 功能特性

<p><strong>桌面环境</strong> —— 毛玻璃 Dock、菜单栏、桌面图标、窗口管理（拖拽 / 缩放 / 最小化 / 全屏）</p>

<p><strong>Spotlight 搜索</strong> —— 菜单栏聚光灯，快速检索应用与内容</p>

<p><strong>Launchpad</strong> —— 一键全屏应用启动台</p>

<p><strong>终端</strong> —— 内置命令行，支持 <code>ls</code> / <code>open</code> / <code>theme</code> / <code>dark</code> / <code>about</code> / <code>lock</code> / <code>sleep</code> 等命令</p>

<p><strong>控制中心</strong> —— WiFi、专注模式、深色模式、亮度、声音输出、锁定屏幕、睡眠（锁定=刷新页面，睡眠=全屏黑屏遮罩）</p>

<p><strong>自定义对话框</strong> —— 全局 macOS 风格毛玻璃 <code>alert</code> / <code>confirm</code> / <code>prompt</code>，覆盖原生浏览器对话框</p>

<p><strong>内置壁纸库</strong> —— 设置内 8 张壁纸一键切换</p>

<p><strong>JHAI 智能助手</strong> —— 原“小宁 AI”的继任者，支持语音 / 文本交互与应用控制</p>

<p><strong>关于本机</strong> —— 版本信息与更新历史</p>

## 内置应用

| 应用 | 说明 |
| --- | --- |
| 访达 Finder | 文件浏览 |
| Safari | 浏览器 |
| 地图 Map | Leaflet 高德地图 |
| 日历 Calendar | 日程 |
| 设置 Settings | 系统偏好设置 |
| 照片 Photos | 图库 |
| 终端 Terminal | 命令行 |
| 关于本机 About | 系统信息 / 更新历史 |
| 应用商店 App Store | 纯网址模式 |
| 天气 Weather | 地区不可用占位页 |
| 灵动岛 Quest | 灵动岛 API 演示 |
| 界合AI | / |
| 便签 text | / |
| 有道 yd | 翻译入口 |

## 技术栈

<p>
  纯静态前端：<strong>HTML5 + CSS3 + 原生 JavaScript</strong>。无构建步骤、无后端依赖，直接托管即可运行。
</p>

<p>
  毛玻璃效果基于 <code>backdrop-filter</code>，对话框 / 控制中心 / 窗口均为自建组件。
</p>

## 本地运行

<p>本项目是纯静态站点，任意静态服务器都能跑：</p>

```bash
# 方式一：Python（无需安装依赖）
cd <项目目录>
python -m http.server 8000
# 浏览器打开 http://localhost:8000

# 方式二：Node
npx serve .
```

<p>
  <sub>直接双击 <code>index.html</code> 用 <code>file://</code> 打开也能看大部分界面，但部分 iframe 应用建议用本地服务器以获得完整体验。</sub>
</p>

## 部署到 Cloudflare Pages

<p>本项目已部署在 Cloudflare Pages（<code>macos</code> 项目，生产分支 <code>main</code>）：</p>

```bash
# 安装 wrangler 后，在项目根目录执行
wrangler pages deploy . --project-name macos --branch main
```

<p>
  <sub>注意：Cloudflare Pages 的自定义域名只跟随 <strong>Production</strong> 部署。若本地 git 分支不是 <code>main</code>，务必加 <code>--branch main</code>，否则只生成 Preview 部署、线上不会更新。</sub>
</p>

## 声明

1. 本项目与 [Apple Inc.](https://www.apple.com) 无任何关系
2. 本项目绝不附属于 Apple Inc.
3. 项目中的 Siri 与 Apple 的智能助手 Siri 无任何关系
4. 本项目中的部分 UI 组件来源于 [uiverse.io](https://uiverse.io/)
5. 项目图标由豆包 AI 生成
6. 原创作者 **Minecraft_goose**，灵感来源于 [Win12 网页版](https://tjy-gitnub.github.io/win12/desktop.html)

## 许可证

<p>本项目基于 <a href="./LICENSE">Apache License 2.0</a> 开源。</p>

```
Copyright 2026 Minecraft_goose

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## 链接

- 仓库地址：<https://github.com/Minecraftgoose/macos-web>
- 项目网址：<https://minecraftgoose.github.io/macos-web> 或 <https://macos.goose.cc.cd>
- 问题反馈：<https://github.com/Minecraftgoose/macos-web/issues>
