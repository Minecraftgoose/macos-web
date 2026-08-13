
// 偏好存储：localStorage['macos_prefs']，同源 iframe 共享同一份数据。
// 同步机制：任何窗口写入 localStorage 后，其他窗口收到 storage 事件自动同步。
// 不再使用 postMessage 传递偏好（iframe 内部应用通信除外）。

const PREFS_KEY = 'macos_prefs';
function loadPrefs() {
    try {
        return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
    } catch(e) { return {}; }
}
function savePrefs() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(window.MacOSPrefs));
}
function getPref(key, def) {
    const v = window.MacOSPrefs[key];
    return v === undefined ? def : v;
}
function setPref(key, value) {
    window.MacOSPrefs[key] = value;
    savePrefs();
    applyPrefs();
}
window.MacOSPrefs = loadPrefs();

function applyPrefs() {
    // 深色模式
    const dark = getPref('darkMode', false);
    document.body.classList.toggle('dark-mode', dark);
    if (window.updateCCDarkMode) window.updateCCDarkMode(dark);
    // 桌面图标
    const iconsVisible = getPref('showDesktopIcons', true);
    const iconsDiv = document.querySelector('.desktop-icons');
    if (iconsDiv) iconsDiv.style.display = iconsVisible ? 'grid' : 'none';
    // Dock 自动隐藏：设置开启 或 有窗口处于全屏且未最小化时隐藏（全屏复用同一隐藏逻辑）

    const autoHide = getPref('autoHideDock', false) || !!(window.windows && window.windows.some(w => w.isFullscreen && !w.minimized));
    document.body.classList.toggle('dock-auto-hide', autoHide);
    syncDockHotzone(autoHide);
    // 同步已打开的设置/关于窗口（iframe 内部样式由它们自己的 storage 监听处理，
    // 这里只需通知 about 等不支持 storage 监听的旧页面）
    syncDarkToAppWindows();
}

// 同步深色模式给已打开的 iframe 应用窗口
function syncDarkToAppWindows() {
    const dark = getPref('darkMode', false);
    if (!window.windows) return;
    window.windows.forEach(win => {
        if (win.app === 'about') {
            const iframe = win.dom.querySelector('iframe');
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage({ type: 'darkMode', enabled: dark }, '*');
            }
        }
    });
}

// Dock 自动隐藏热区：开启时注入底部热区 div，悬停弹出 Dock
function syncDockHotzone(enabled) {
    let hotzone = document.getElementById('dock-hotzone');
    if (enabled && !hotzone) {
        hotzone = document.createElement('div');
        hotzone.id = 'dock-hotzone';
        hotzone.className = 'dock-hotzone';
        const wrapper = document.querySelector('.dock-wrapper');
        if (wrapper && wrapper.parentNode) {
            wrapper.parentNode.insertBefore(hotzone, wrapper);
        } else {
            document.body.appendChild(hotzone);
        }
    } else if (!enabled && hotzone) {
        hotzone.remove();
    }
}

// 监听 storage 事件：其他窗口（如设置 App）写入偏好时自动同步
window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (e.key === PREFS_KEY) {
        window.MacOSPrefs = loadPrefs();
        applyPrefs();
    } else if (e.key === 'macos_screentime_minutes') {
        // 屏幕使用时间由设置窗口自己的 storage 监听刷新，这里无需处理
    }
});

window.addEventListener('message', (e) => {
    const data = e.data;
    if (!data) return;
    if (data.type === 'closeWindow') {
        const win = windows.find(w => w.dom.querySelector('iframe') === e.source.frameElement);
        if (win) closeWindow(win);
    } else if (data.type === 'appStore') {
        const { action, payload } = data;
        if (action === 'registerApps') {
            if (window.AppStore?.registerCatalog) window.AppStore.registerCatalog(payload);
            if (e.source) e.source.postMessage({ type: 'appStore', action: 'installedList', apps: window.AppStore?.getInstalledIds() || [] }, '*');
        } else if (action === 'install') {
            if (window.AppStore?.install) window.AppStore.install(payload);
            if (e.source) e.source.postMessage({ type: 'appStore', action: 'installedList', apps: window.AppStore?.getInstalledIds() || [] }, '*');
        } else if (action === 'uninstall') {
            if (window.AppStore?.uninstall) window.AppStore.uninstall(payload);
            if (e.source) e.source.postMessage({ type: 'appStore', action: 'installedList', apps: window.AppStore?.getInstalledIds() || [] }, '*');
        } else if (action === 'openApp') {
            if (window.openApp) window.openApp(payload);
        } else if (action === 'getInstalledApps') {
            if (e.source) e.source.postMessage({ type: 'appStore', action: 'installedList', apps: window.AppStore?.getInstalledIds() || [] }, '*');
        } else if (action === 'installCustomApp') {
            if (window.AppStore?.installCustomApp) {
                window.AppStore.installCustomApp(payload).then(result => {
                    if (e.source) e.source.postMessage({ type: 'appStore', action: 'customAppInstalled', success: true, data: result }, '*');
                }).catch(err => {
                    if (e.source) e.source.postMessage({ type: 'appStore', action: 'customAppInstalled', success: false, error: err.message }, '*');
                });
            }
        }
    } else if (data.type === 'getDarkMode') {
        if (e.source) e.source.postMessage({ type: 'darkMode', enabled: document.body.classList.contains('dark-mode') }, '*');
    } else if (data.type === 'terminal') {
        // 终端命令通道：iframe 内终端调用系统能力
        const { command, payload, reqId } = data;
        let result = '';
        let ok = true;
        try {
            switch (command) {
                case 'openApp': {
                    if (window.openApp) window.openApp(payload).catch?.(() => {});
                    result = `已打开 ${payload}`;
                    break;
                }
                case 'setDarkMode': {
                    setPref('darkMode', !!payload);
                    result = payload ? '已切换深色模式' : '已切换浅色模式';
                    break;
                }
                case 'setWallpaper': {
                    localStorage.setItem('macos_wallpaper', payload);
                    applyWallpaper();
                    result = '壁纸已更换';
                    break;
                }
                case 'wallpaperList': {
                    result = (window.BUILTIN_WALLPAPERS || []).map(w => w.file).join('\n');
                    break;
                }
                case 'lockScreen': {
                    if (window.lockScreen) window.lockScreen();
                    else window.location.reload();
                    result = '屏幕已锁定（刷新中）';
                    break;
                }
                case 'sleep': {
                    if (window.enterSleepMode) window.enterSleepMode();
                    result = '已进入睡眠模式';
                    break;
                }
                case 'notify': {
                    if (window.dynamicIsland && window.dynamicIsland.notify) {
                        window.dynamicIsland.notify({ title: payload?.title || '通知', subtitle: payload?.message || '', duration: 3000 });
                    }
                    result = '已发送通知';
                    break;
                }
                case 'about': {
                    const account = window.Onboarding?.getAccount?.();
                    result = [
                        `系统名称：macOS 网页版`,
                        `版本：1.0.25`,
                        `用户：${account?.username || '未登录'}`,
                        `窗口数：${(window.windows || []).length}`
                    ].join('\n');
                    break;
                }
                case 'listApps': {
                    result = Object.keys(window.appConfig || {}).join('\n');
                    break;
                }
                default:
                    ok = false;
                    result = `未知命令: ${command}`;
            }
        } catch (err) {
            ok = false;
            result = err.message || String(err);
        }
        if (e.source) e.source.postMessage({ type: 'terminalResult', reqId, ok, data: result }, '*');
    }
});

// 启动时应用已存偏好
applyPrefs();
