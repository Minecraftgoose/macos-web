// ========== main.js - 主入口（系统初始化） ==========
// 依赖顺序：config, utils, drag-resize, window-core, app-store, message
// 说明：应用配置 appConfig 已拆至 modules/config.js

// ========== 桌面壁纸：优先用设置页上传的自定义壁纸，否则回退 Sonoma 风格渐变（零下载） ==========
const WALLPAPER_FALLBACK = 'linear-gradient(135deg, #4b2c6f 0%, #7b3f8f 38%, #c96f8f 72%, #f0a06a 100%)';
function applyWallpaper() {
    const desktop = document.querySelector('.desktop');
    if (!desktop) return;
    const saved = localStorage.getItem('macos_wallpaper');
    desktop.style.backgroundImage = saved ? `url('${saved}')` : WALLPAPER_FALLBACK;
}
// 设置页（iframe）上传/恢复壁纸后，通过 storage 事件同步到桌面
window.addEventListener('storage', (e) => {
    if (e.key === 'macos_wallpaper') applyWallpaper();
});

// 开机动画（仅首次，3秒）
async function startBootAnimation() {
    const bootScreen = document.getElementById('boot-screen');
    if (!bootScreen) return;
    await new Promise(r => setTimeout(r, 3000));
    bootScreen.classList.add('hide-boot');
    setTimeout(() => bootScreen.style.display = 'none', 1500);
}

// 跳过开机动画（非首次直接登录时调用）
function hideBootInstantly() {
    const bootScreen = document.getElementById('boot-screen');
    if (bootScreen) {
        bootScreen.classList.add('hide-boot');
        bootScreen.style.display = 'none';
    }
}

// 菜单栏初始化
function initMenuBar() {
    const aboutMenuItem = document.querySelector('.menu-item .submenu ul li:first-child a');
    if (aboutMenuItem && aboutMenuItem.textContent.includes('关于本机')) {
        aboutMenuItem.addEventListener('click', (e) => { e.preventDefault(); openApp('about'); });
    }
    const prefsMenuItem = document.getElementById('menu-settings');
    if (prefsMenuItem) {
        prefsMenuItem.addEventListener('click', (e) => { e.preventDefault(); openApp('settings'); });
    }
    document.querySelectorAll('.menu-item').forEach(menu => {
        const title = menu.querySelector('.menu-title');
        if (title && title.textContent === '文件') {
            const submenuItems = menu.querySelectorAll('.submenu li a');
            submenuItems.forEach(sub => {
                if (sub.textContent.includes('新建访达窗口')) sub.addEventListener('click', (e) => { e.preventDefault(); openApp('finder'); });
                if (sub.textContent.includes('关闭')) {
                    sub.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (activeWindow) closeWindow(activeWindow);
                        else window.MacOSDialog?.alert({ title: '提示', message: '没有活动窗口' });
                    });
                }
            });
        }
        if (title && title.textContent === '窗口') {
            const submenuItems = menu.querySelectorAll('.submenu li a');
            submenuItems.forEach(sub => {
                if (sub.textContent.includes('最小化')) {
                    sub.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (activeWindow && !activeWindow.minimized) minimizeWindow(activeWindow);
                    });
                }
                if (sub.textContent.includes('缩放')) {
                    sub.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (activeWindow) toggleFullscreen(activeWindow);
                    });
                }
            });
        }
    });
    const helpSearch = document.querySelector('.menu-item:last-child .submenu li a');
    if (helpSearch && helpSearch.textContent.includes('macOS 帮助')) {
        helpSearch.addEventListener('click', (e) => {
            e.preventDefault();
            openApp('about');
            setTimeout(() => {
                const aboutWin = windows.find(w => w.app === 'about' && !w.minimized);
                if (aboutWin) {
                    const iframe = aboutWin.dom.querySelector('iframe');
                    if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'switchTab', tab: 'software' }, '*');
                }
            }, 500);
        });
    }

    // 三击 Apple logo 清理
    (function() {
        const appleLogo = document.querySelector('.menu-item:first-child .menu-title');
        if (!appleLogo) return;
        let clickCount = 0, clickTimer = null;
        appleLogo.addEventListener('click', (e) => {
            e.stopPropagation();
            clickCount++;
            if (clickCount === 1) {
                clickTimer = setTimeout(() => { clickCount = 0; }, 800);
            } else if (clickCount === 3) {
                clearTimeout(clickTimer);
                clickCount = 0;
                if (window.windows && Array.isArray(window.windows)) {
                    [...window.windows].forEach(win => { try { closeWindow(win); } catch(e) {} });
                }
                if (window.DockManager && window.DockManager.runningApps) {
                    window.DockManager.runningApps.forEach((state, appName) => {
                        if (state.dockItem && state.dockItem.parentNode) state.dockItem.remove();
                    });
                    window.DockManager.runningApps.clear();
                    window.DockManager.updatePlaceholder();
                }
                window.dynamicIsland?.notify({ title: '开发者模式', subtitle: '已强制清理所有窗口和动态Dock', duration: 2000 });
            }
        });
    })();

    // ========== 其余菜单项绑定 ==========
    document.querySelectorAll('.menu-item').forEach(menu => {
        const title = menu.querySelector('.menu-title');
        if (!title) return;
        const items = menu.querySelectorAll('.submenu li a');
        const bind = (text, fn) => {
            items.forEach(a => {
                if (a.textContent.includes(text)) {
                    a.addEventListener('click', (e) => { e.preventDefault(); fn(); });
                }
            });
        };

        // Apple 菜单
        if (title.textContent.includes('apple') || title.querySelector('i')) {
            bind('App Store...', () => openApp('appstore'));
            bind('访达', () => openApp('finder'));
        }
        // 文件菜单
        if (title.textContent === '文件') {
            bind('关闭所有窗口', () => {
                [...(window.windows || [])].forEach(win => closeWindow(win));
            });
        }
        // 显示菜单：整理桌面图标
        if (title.textContent === '显示') {
            bind('整理', () => {
                const grid = document.querySelector('.desktop-icons');
                if (!grid) return;
                // 简单重排动画：重新设置 grid 顺序
                const icons = Array.from(grid.children);
                icons.forEach(icon => grid.appendChild(icon));
            });
        }
        // 前往菜单：打开访达对应路径
        if (title.textContent === '前往') {
            const pathMap = { '应用程序': 'applications', '桌面': 'desktop', '文稿': 'documents' };
            items.forEach(a => {
                const text = a.textContent;
                if (pathMap[text]) {
                    a.addEventListener('click', (e) => {
                        e.preventDefault();
                        openApp('finder');
                        setTimeout(() => {
                            const finderWin = windows.find(w => w.app === 'finder' && !w.minimized);
                            if (finderWin) {
                                const iframe = finderWin.dom.querySelector('iframe');
                                if (iframe && iframe.contentWindow) {
                                    iframe.contentWindow.postMessage({ type: 'switchPath', path: pathMap[text] }, '*');
                                }
                            }
                        }, 500);
                    });
                }
            });
        }
    });
}

// 桌面图标初始化
function initDesktopIcons() {
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        if (icon.getAttribute('data-dock-bound') === 'true') return;
        const app = icon.getAttribute('data-app');
        if (app && app !== 'trash') {
            icon.setAttribute('data-dock-bound', 'true');
            icon.addEventListener('dblclick', () => openApp(app));
            let lastTap = 0;
            icon.addEventListener('touchstart', (e) => {
                const now = Date.now();
                if (now - lastTap < 300) { openApp(app); lastTap = 0; }
                else lastTap = now;
            });
        }
    });
}

// 更新时间
function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timeElement = document.getElementById('current-time');
    if (timeElement) timeElement.textContent = timeStr;
}

// ========== 屏幕使用时间统计（本地累计，分钟级） ==========
function initScreenTimeTracker() {
    const prefs = window.MacOSPrefs || {};
    if (!prefs.screenTime) return;
    // 每分钟累计 1 分钟（写 localStorage，设置窗口通过 storage 事件自动刷新）
    setInterval(() => {
        let minutes = parseInt(localStorage.getItem('macos_screentime_minutes') || '0', 10);
        minutes += 1;
        localStorage.setItem('macos_screentime_minutes', String(minutes));
    }, 60000);
}

// ========== 启动时恢复上次打开的窗口（设置偏好） ==========
async function restoreLastApps() {
    const prefs = window.MacOSPrefs || {};
    if (!prefs.autoOpenWindows) return;
    let last = [];
    try {
        last = JSON.parse(localStorage.getItem('macos_last_apps') || '[]');
    } catch(e) {}
    if (!last.length) return;
    for (const appName of last) {
        if (window.appConfig && window.appConfig[appName]) {
            // skipLastApps: 恢复过程本身不再写回记录，避免死循环
            try { await window.openApp(appName, { skipLastApps: true }); } catch(e) {}
            await new Promise(r => setTimeout(r, 500));
        }
    }
}

// 进入桌面（注册/登录完成后调用）
function enterDesktop() {
    bindGlobalDragResizeListeners();
    applyWallpaper();   // 应用桌面壁纸（自定义上传或默认渐变）
    updateTime();
    setInterval(updateTime, 60000);
    initMenuBar();
    initDesktopIcons();
    initScreenTimeTracker();
    restoreLastApps();
    console.log('macOS 网页版 v1.0.24');
}

// DOM 加载完成初始化
document.addEventListener('DOMContentLoaded', async () => {
    let attempts = 0;
    while (!window.AnimationManager && attempts < 50) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    if (window.AnimationManager) console.log('AnimationManager 已加载');
    else console.warn('AnimationManager 未加载');

    // 首次开机 + 引导注册；之后跳过开机直接登录
    const account = window.Onboarding ? window.Onboarding.getAccount() : null;

    if (!account) {
        // 首次：播放开机动画 → 模拟注册引导
        await startBootAnimation();
        if (window.Onboarding) await window.Onboarding.runOnboarding();
    } else {
        // 回访：跳过开机，直接登录界面
        hideBootInstantly();
        if (window.Onboarding) await window.Onboarding.runLogin(account);
    }

    enterDesktop();
});

// ========== 挂载全局 API ==========
setTimeout(() => {
    if (typeof window.enhancedOpenApp === 'function') {
        window.openApp = window.enhancedOpenApp;
        console.log('[script.js] openApp :', window.openApp.name);
    } else if (window.AppStore && window.AppStore.enhancedOpenApp) {
        window.openApp = window.AppStore.enhancedOpenApp;
        console.log('[script.js] openApp 已绑定为 AppStore');
    } else {
        console.warn('[script.js] 未找到');
    }
}, 0);

window.macOS = { openApp: () => window.openApp, windows, activeWindow, version: '3.0-fixed' };
window.closeWindow = closeWindow;
window.minimizeWindow = minimizeWindow;
window.restoreWindow = restoreWindow;
window.installApp = (appId) => window.AppStore?.install(appId);
window.uninstallApp = (appId) => window.AppStore?.uninstall(appId);
window.appConfig = appConfig;

window.addEventListener('islandRestoreWindow', (e) => {
    const appName = e.detail?.appName;
    if (!appName) return;
    const win = windows.find(w => w.app === appName && w.minimized);
    if (win && typeof restoreWindow === 'function') restoreWindow(win);
});

window.DynamicIslandAPI = {
    notify: (opts) => window.dynamicIsland?.notify(opts),
    status: (opts) => window.dynamicIsland?.status(opts),
    progress: (opts) => window.dynamicIsland?.progress(opts),
    setProgress: (value, text) => window.dynamicIsland?.setProgress(value, text),
    idle: () => window.dynamicIsland?.idle(),
    show: (mode, duration) => window.dynamicIsland?.notify({ title: mode || '提示', duration: duration || 3000 }),
    hide: () => window.dynamicIsland?.idle()
};