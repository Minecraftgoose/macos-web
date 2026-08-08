# 灵动岛 (Dynamic Island) 调用 API 文档

macOS 网页版内置的灵动岛组件。位于屏幕顶部中央，模拟 iPhone 14 Pro 灵动岛交互：
空闲时为黑色小胶囊 → 触发通知/状态/进度时平滑展开 → 可点击收起/再展开 → 自动或手动恢复空闲。

---

## 一、两种调用方式

### 方式 A：同页直接调用（推荐）

灵动岛实例挂在全局 `window.dynamicIsland` 上，同一窗口（或 iframe 内通过 `window.parent.dynamicIsland`）可直接调用。

```js
// 主窗口
window.dynamicIsland.notify({ title: '你好', duration: 3000 });

// iframe 应用内（如终端、设置等 apps/*.html）
window.parent.dynamicIsland.notify({ title: '来自子窗口', duration: 2000 });
```

### 方式 B：消息通道调用（跨 iframe 推荐）

iframe 应用通过 `postMessage` 发 `{ type: 'island', action, payload }`，主窗口的灵动岛自动监听执行。

```js
window.parent.postMessage({
    type: 'island',
    action: 'notify',            // 可选: notify / status / progress / setProgress / idle / send
    payload: { title: '通知', subtitle: '内容', duration: 2000 }
}, '*');
```

> 注意：`action` 对应灵动岛的方法名；`payload` 对应方法参数（对象形式）。

---

## 二、统一方法速查

| 方法 | 作用 | 默认展开尺寸 |
|---|---|---|
| `notify(opts)` | 临时通知，可带时长自动消失 | small (320x80) |
| `status(opts)` | 持续状态，需手动 `idle()` 清除 | small (320x80) |
| `progress(opts)` | 进度条任务 | large (380x180) |
| `setProgress(value, text)` | 更新进度条 | —（不改变模式） |
| `idle()` | 恢复空闲胶囊 | — |
| `send(action, payload)` | 通用转发（自定义 action 时用） | — |
| `expand()` / `collapse()` | 手动展开 / 收起（仅当前非 idle 时有效） | — |

---

## 三、各方法详细参数

### 1. notify —— 临时通知

```js
window.dynamicIsland.notify({
    cardSize: 'small',          // 可选，'small' | 'large'，默认 'small'
    icon: 'fa-bell',            // 可选，Font Awesome 图标类名（fa-solid 前缀省略）
    iconColor: '#007aff',       // 可选，图标/圆角方块背景色，默认 #007aff
    title: '下载完成',           // 必填，主标题
    subtitle: '共 3 个文件',      // 可选，副标题
    duration: 3000              // 可选，毫秒，到时自动恢复空闲；不传则常驻
});
```

行为：
- 展开为 small 卡片：左侧图标方块 + 中间标题/副标题 + 右侧关闭按钮
- 点击关闭按钮 → 立即 `idle()`
- 点击卡片其他区域 → 收起/再展开（切换）
- 传入 `duration` 时自动消失

### 2. status —— 持续状态（常驻）

```js
window.dynamicIsland.status({
    cardSize: 'small',          // 可选，默认 'small'
    icon: 'fa-circle',
    iconColor: '#34c759',
    title: '正在播放',           // 必填
    subtitle: '歌曲名 - 歌手'     // 可选
});
```

行为：与 notify 相同，但**不会自动消失**，必须调用 `idle()` 清除（如录制中、连接中状态）。

### 3. progress —— 进度条任务

```js
window.dynamicIsland.progress({
    cardSize: 'large',          // 可选，默认 'large'
    icon: 'fa-download',
    iconColor: '#007aff',
    title: '正在下载',           // 必填
    progress: 0,                // 可选，0-100，默认 0
    progressText: '0%'          // 可选，进度下方文字
});
```

后续更新进度：

```js
// 方式 1：分参数
window.dynamicIsland.setProgress(45, '45%');

// 方式 2：对象形式
window.dynamicIsland.setProgress({ value: 45, text: '45%' });

// 消息通道形式
window.parent.postMessage({ type: 'island', action: 'setProgress', payload: { value: 45, text: '45%' } }, '*');
```

完成时务必 `idle()` 收起：

```js
window.dynamicIsland.idle();
```

> 内部实现会 clamp 到 0-100；`setProgress` 只在当前模式为 `progress` 时生效。

### 4. idle —— 恢复空闲

```js
window.dynamicIsland.idle();
```

恢复为顶部黑色小胶囊（120x36）。任何模式都能调用，安全幂等。

### 5. send —— 自定义动作转发

```js
window.island.send('yourCustomAction', { any: 'data' });
```

> 仅当主窗口 `dynamicIsland` 上存在同名方法时才会被调用（如扩展了自定义方法）。非内置 action 不会报错但也不生效。

---

## 四、全局别名与快捷封装

### window.island（简写别名）

`window.island === window.IslandAPI`，方法同 IslandAPI（见下）。

### window.DynamicIslandAPI（main.js 暴露的快捷封装）

```js
window.DynamicIslandAPI.notify(opts)                       // → notify
window.DynamicIslandAPI.status(opts)                       // → status
window.DynamicIslandAPI.progress(opts)                     // → progress
window.DynamicIslandAPI.setProgress(value, text)           // → setProgress
window.DynamicIslandAPI.idle()                             // → idle
window.DynamicIslandAPI.show(mode, duration)               // → notify({ title: mode, duration })
window.DynamicIslandAPI.hide()                             // → idle
```

> 注意：`DynamicIslandAPI` 的 `notify/status/progress` 直接转发给 `window.dynamicIsland`（真实实例），**主窗口可用**。而 `window.island` / `IslandAPI` 是 **iframe 消息通道封装**（见"常见坑"第 4 条）——仅在子窗口里调用才会发消息给主窗口，主窗口里直接用它无效。

---

## 五、iframe 应用内推荐用法

若你在写 `apps/*.html`（如终端、设置等子窗口应用），推荐：

```js
// 依赖 island-api.js（若页面已加载）：
window.parent.IslandAPI.notify({ title: '安装完成', duration: 2000 });

// 或者纯消息通道（零依赖）：
window.parent.postMessage({ type: 'island', action: 'notify', payload: { title: '安装完成', duration: 2000 } }, '*');
```

---

## 六、实际调用示例（参考代码）

### 示例 1：Siri 发通知（siri.js 实际用法）

```js
window.dynamicIsland.notify({ title: '屏幕已锁定', subtitle: '', duration: 3000 });
```

### 示例 2：AppStore 安装进度（app-store.js 实际用法）

```js
window.dynamicIsland.progress({ title: '正在安装 照片', subtitle: '0%', progress: 0, progressText: '0%' });
// 循环更新
window.dynamicIsland.setProgress(prog, `${prog}%`);
// 完成
window.dynamicIsland.idle();
window.dynamicIsland.notify({ title: '照片', subtitle: '已添加至桌面', duration: 2000 });
```

### 示例 3：终端 notify 命令 → message.js 通道

终端里敲 `notify 你好` → iframe 发 `{type:'terminal', command:'notify'}` → message.js 收到后调用：

```js
window.dynamicIsland.notify({ title: payload?.title || '通知', subtitle: payload?.message || '', duration: 3000 });
```

---

## 七、状态机

```
            notify(status/progress)
   idle ───────────────────────────────▶ expanded
     ▲                                    │  ▲
     │            idle()                   │  │ 点击卡片
     └────────────────────────────────────┘  └──▶ collapsed
          notify 带 duration 自动回到 idle
```

- idle：120x36 黑胶囊
- expanded-small：320x80（notify / status）
- expanded-large：380x180（progress）
- 点击卡片非按钮区域：在 expanded ↔ collapsed 之间切换
- 点击外部区域：若 expanded 则收起为 collapsed
- 点击右侧关闭按钮（仅 notify）：立即 idle

---

## 八、z-index 与样式要点

- 容器：`.dynamic-island`，`position: fixed; top: 8px; left: 50%`，`z-index: 10001`
- 展开尺寸类：`.expanded-small` / `.expanded-large`
- 深色模式：`body.dark-mode .dynamic-island` 背景加深（rgba(28,28,30,0.92)）
- 移动端（≤768px）：large → 320x160，small → 280x70
- 内部结构：`.island-compact`（收起态内容）、`.island-left/.island-center/.island-right`（展开态三区）
- 进度条：`.island-progress-track` + `.island-progress-fill`（width 百分比驱动）

---

## 九、相关文件

| 文件 | 作用 |
|---|---|
| `modules/dynamic-island.js` | 核心类 `DynamicIsland`，实例挂 `window.dynamicIsland` |
| `modules/island-api.js` | 消息通道封装 `IslandAPI`，别名 `window.island` |
| `css/dynamic-island.css` | 全部样式 |
| `modules/main.js` | 暴露 `window.DynamicIslandAPI` 快捷封装 |
| `modules/message.js` | 转发 iframe 的 `terminal` 命令中的 notify 到灵动岛 |
| `modules/siri.js` | Siri 的 notify/status/progress 工具调用示例 |
| `modules/app-store.js` | 安装进度条完整示例 |

---

## 十、常见坑

1. **`setProgress` 在非 progress 模式下不生效** —— 先 `progress()` 再 `setProgress()`。
2. **notify 不传 `duration` 会常驻** —— 常驻时只能点关闭按钮或手动 `idle()`。
3. **iframe 里直接用 `window.dynamicIsland` 拿不到** —— 灵动岛实例只存在于主窗口；子窗口要用 `window.parent.dynamicIsland` 或 postMessage 通道。
4. **`IslandAPI` 是 iframe 专用消息通道封装** —— `_send` 里 `if (window.parent !== window)` 才发消息：**在主窗口调用 `window.island.notify()` 是静默无效的**（不会发消息也不会本地执行）。主窗口请直接用 `window.dynamicIsland`；iframe 里用 `window.parent.IslandAPI` 或 `window.parent.island` 才会真正生效。
5. **图标用 Font Awesome 类名**，如 `fa-bell`、`fa-download`、`fa-spinner`，渲染时会拼成 `fa-solid fa-bell`。
