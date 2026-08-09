// ========== 应用商店与动态安装 ==========
const INSTALLED_APPS_KEY = 'installedApps';
const INSTALLED_APPS_CONFIG_KEY = 'installedAppsConfig';
let availableApps = {};

const BUILTIN_APPS = [
    'finder', 'safari', 'calendar', 'photos', 'settings',
    'weather', 'yd', 'about', 'quest', 'xn', 'text', 'appstore'
];

function getCurrentInstalledIds() {
    return Object.keys(window.appConfig).filter(id => !BUILTIN_APPS.includes(id));
}

function saveInstalledApps() {
    localStorage.setItem(INSTALLED_APPS_KEY, JSON.stringify(getCurrentInstalledIds()));
}

function loadInstalledAppIds() {
    const stored = localStorage.getItem(INSTALLED_APPS_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveInstalledAppConfig(appId, config) {
    let allConfigs = JSON.parse(localStorage.getItem(INSTALLED_APPS_CONFIG_KEY) || '{}');
    allConfigs[appId] = config;
    localStorage.setItem(INSTALLED_APPS_CONFIG_KEY, JSON.stringify(allConfigs));
}

function removeInstalledAppConfig(appId) {
    let allConfigs = JSON.parse(localStorage.getItem(INSTALLED_APPS_CONFIG_KEY) || '{}');
    delete allConfigs[appId];
    localStorage.setItem(INSTALLED_APPS_CONFIG_KEY, JSON.stringify(allConfigs));
}

function loadAllInstalledAppConfigs() {
    return JSON.parse(localStorage.getItem(INSTALLED_APPS_CONFIG_KEY) || '{}');
}

// favicon.im 图标服务已弃用，图标一律走应用目录的 icon_url 字段（无则显示默认图标）
// 兜底：icon_url 为空或旧 favicon.im 失效时，用国内可访问的 ico.la4.cn 按域名生成
function getFaviconFallback(url) {
    if (!url) return null;
    try {
        const d = new URL(url).hostname;
        return d ? 'https://ico.la4.cn/ico.php?url=' + d : null;
    } catch(e) { return null; }
}

function notifyAppStoreWindows() {
    const installedList = getCurrentInstalledIds();
    document.querySelectorAll('iframe').forEach(iframe => {
        try {
            if (iframe.contentWindow && iframe.src && iframe.src.includes('appstore.html')) {
                iframe.contentWindow.postMessage({
                    type: 'appStore',
                    action: 'installedList',
                    apps: installedList
                }, '*');
            }
        } catch(e) { /* 跨域忽略 */ }
    });
}

function addDesktopIcon(appId) {
    const app = window.appConfig[appId];
    if (!app) return;
    const desktopIcons = document.querySelector('.desktop-icons');
    if (!desktopIcons) return;
    if (desktopIcons.querySelector(`.desktop-icon[data-app="${appId}"]`)) return;

    let iconHtml = '';
    if (app.favicon) {
        iconHtml = `<img src="${app.favicon}" alt="${app.title}" style="width:50px;height:50px;object-fit:contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';"><i class="${app.iconClass || 'fas fa-globe'}" style="display:none; font-size:50px; color:${app.iconColor || '#007aff'};"></i>`;
    } else {
        iconHtml = `<i class="${app.iconClass || 'fas fa-globe'}" style="font-size:50px; color:${app.iconColor || '#007aff'};"></i>`;
    }

    const newIcon = document.createElement('div');
    newIcon.className = 'desktop-icon';
    newIcon.setAttribute('data-app', appId);
    newIcon.setAttribute('data-type', 'app');
    newIcon.setAttribute('data-name', app.title);
    newIcon.innerHTML = `<div class="icon-container">${iconHtml}</div><span>${app.title}</span>`;

    newIcon.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (window.openApp) window.openApp(appId);
    });
    let lastTap = 0;
    newIcon.addEventListener('touchstart', (e) => {
        const t = Date.now();
        if (t - lastTap < 300) { window.openApp && window.openApp(appId); lastTap = 0; }
        else lastTap = t;
    });

    desktopIcons.appendChild(newIcon);
}

function removeDesktopIcon(appId) {
    const icon = document.querySelector(`.desktop-icon[data-app="${appId}"]`);
    if (icon) icon.remove();
}

function registerAvailableApps(catalog) {
    availableApps = catalog;
    console.log('[AppStore] 已注册应用目录:', Object.keys(availableApps));
}

// ========== 安装函数（增加即时反馈） ==========
async function installApp(appId) {
    console.log('[AppStore] 尝试安装:', appId, '当前目录:', Object.keys(availableApps));
    
    const appInfo = availableApps[appId];
    if (!appInfo) {
        const msg = `未找到应用: ${appId}`;
        console.warn(msg);
        window.dynamicIsland?.notify({ title: '安装失败', subtitle: msg, duration: 2000 });
        return false;
    }
    
    if (window.appConfig[appId]) {
        window.dynamicIsland?.notify({ title: appInfo.name, subtitle: '已经安装过了', duration: 1500 });
        return false;
    }

    // 开始安装通知
    window.dynamicIsland?.notify({ 
        title: `开始安装 ${appInfo.name}`, 
        subtitle: '正在准备...', 
        duration: 1500 
    });

    // 显示进度
    window.dynamicIsland?.progress({
        title: `正在下载 ${appInfo.name}`,
        subtitle: '0%',
        progress: 0,
        progressText: '0%'
    });

    const totalSteps = 20;
    for (let i = 1; i <= totalSteps; i++) {
        await new Promise(r => setTimeout(r, 80));
        const percent = Math.min(100, Math.round((i / totalSteps) * 100));
        window.dynamicIsland?.setProgress(percent, `${percent}%`);
    }

    const favicon = appInfo.icon_url || getFaviconFallback(appInfo.url);
    const fullConfig = {
        title: appInfo.name,
        src: appInfo.url,
        defaultW: appInfo.defaultW || 800,
        defaultH: appInfo.defaultH || 600,
        isRemote: true,
        favicon: favicon,
        iconClass: appInfo.icon || 'fas fa-globe',
        iconColor: appInfo.iconColor || '#007aff'
    };
    window.appConfig[appId] = fullConfig;
    addDesktopIcon(appId);
    saveInstalledAppConfig(appId, fullConfig);
    saveInstalledApps();
    notifyAppStoreWindows();

    window.dynamicIsland?.setProgress(100, '完成');
    await new Promise(r => setTimeout(r, 600));
    window.dynamicIsland?.idle();
    window.dynamicIsland?.notify({ title: appInfo.name, subtitle: '已添加到桌面', duration: 2000 });
    
    console.log('[AppStore] 安装完成:', appId);
    return true;
}

function uninstallApp(appId) {
    if (BUILTIN_APPS.includes(appId)) {
        window.dynamicIsland?.notify({ title: '系统应用', subtitle: '不能卸载内置应用', duration: 1500 });
        return false;
    }

    const app = window.appConfig[appId];
    if (!app) {
        window.dynamicIsland?.notify({ title: '卸载失败', subtitle: '应用不存在', duration: 1500 });
        return false;
    }

    (window.windows || []).filter(w => w.app === appId).forEach(win => {
        if (typeof closeWindow === 'function') closeWindow(win);
    });

    delete window.appConfig[appId];
    removeDesktopIcon(appId);
    removeInstalledAppConfig(appId);
    saveInstalledApps();
    notifyAppStoreWindows();

    window.dynamicIsland?.notify({ title: app.title, subtitle: '已移除', duration: 1500 });
    return true;
}

function ensureAppStoreAvailable() {
    if (!window.appConfig) window.appConfig = {};
    const appStoreSrc = '../apps/appstore.html';
    if (!window.appConfig.appstore) {
        window.appConfig.appstore = {
            title: 'App Store',
            src: appStoreSrc,
            defaultW: 900,
            defaultH: 700,
            iconClass: 'fas fa-app-store',
            iconColor: '#007aff',
            favicon: null
        };
    }
    if (!document.querySelector(`.desktop-icon[data-app="appstore"]`)) {
        addDesktopIcon('appstore');
    }
}

function restoreInstalledAppsFromStorage() {
    const allConfigs = loadAllInstalledAppConfigs();
    for (const [appId, config] of Object.entries(allConfigs)) {
        if (!window.appConfig[appId]) {
            const cfg = { ...config };
            if (!cfg.iconClass) cfg.iconClass = 'fas fa-globe';
            if (!cfg.iconColor) cfg.iconColor = '#007aff';
            // 迁移旧 favicon：favicon.im 已退役（加载必失败），或原本为空且是远程应用 → 换 la4 兜底
            if ((!cfg.favicon || cfg.favicon.indexOf('favicon.im') !== -1) && cfg.src && /^https?:\/\//i.test(cfg.src)) {
                cfg.favicon = getFaviconFallback(cfg.src);
                saveInstalledAppConfig(appId, cfg);
            }
            window.appConfig[appId] = cfg;
            addDesktopIcon(appId);
        }
    }
    saveInstalledApps();
    notifyAppStoreWindows();
}

// ---------- 并发锁 ----------
const pendingOpenApps = new Set();

async function enhancedOpenApp(appName, options = {}) {
    if (pendingOpenApps.has(appName)) {
        console.log(`[AppStore] ${appName} 正在打开中，忽略重复请求`);
        return null;
    }
    pendingOpenApps.add(appName);

    try {
        if (window.windows) {
            window.windows = window.windows.filter(win => win && win.dom && document.body.contains(win.dom));
        }
        if (appName === 'appstore') ensureAppStoreAvailable();

        const existing = window.windows?.find(w => w.app === appName && !w.minimized);
        if (existing) {
            focusWindow(existing);
            window.dispatchEvent(new CustomEvent('appOpened', {
                detail: { appName: appName, windowId: existing.id }
            }));
            return existing;
        }
        const min = window.windows?.find(w => w.app === appName && w.minimized);
        if (min) {
            restoreWindow(min);
            focusWindow(min);
            window.dispatchEvent(new CustomEvent('appOpened', {
                detail: { appName: appName, windowId: min.id }
            }));
            return min;
        }

        const app = window.appConfig?.[appName];
        if (!app) {
            console.warn(`[AppStore] 未找到应用配置: ${appName}`);
            return null;
        }

        // 确保 Dock 图标已存在（非固定应用）
        if (window.DockManager && typeof window.DockManager.ensureAppIcon === 'function') {
            window.DockManager.ensureAppIcon(appName);
        }

        const offset = (window.windows?.length || 0) * 30;
        const left = options.left ?? (100 + offset);
        const top = options.top ?? (60 + offset);
        const width = options.width ?? (app.defaultW || 800);
        const height = options.height ?? (app.defaultH || 600);

        const winObj = await createWindow(appName, left, top, width, height);
        if (winObj) {
            if (window.windows) window.windows.push(winObj);
            updateBadge(appName);
            focusWindow(winObj);
            window.dispatchEvent(new CustomEvent('appOpened', {
                detail: { appName: appName, windowId: winObj.id }
            }));
            if (window.DockManager) {
                window.DockManager.registerWindow?.(appName, winObj.id);
            }
            // 记录打开的应用（设置里"启动时自动打开上次的窗口"用）
            // skipLastApps=true 时不记录：批量打开（Siri"打开所有应用"）与启动恢复不应污染记录
            if (!options.skipLastApps) {
                try {
                    const last = JSON.parse(localStorage.getItem('macos_last_apps') || '[]');
                    if (!last.includes(appName)) {
                        last.push(appName);
                        localStorage.setItem('macos_last_apps', JSON.stringify(last.slice(-20)));
                    }
                } catch(e) {}
            }
        }
        return winObj;
    } finally {
        pendingOpenApps.delete(appName);
    }
}

// ---------- 自定义应用安装（纯网址模式，不依赖 freekit 托管） ----------
async function installCustomAppFromStore(appData) {
    const { name, content, iconUrl: providedIconUrl, id: customId } = appData;
    const appId = customId || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    if (!content) throw new Error('缺少网址');

    window.dynamicIsland?.progress({
        title: `正在安装 ${name}`,
        subtitle: '0%',
        progress: 0,
        progressText: '0%'
    });

    let progressInterval;
    if (window.dynamicIsland) {
        let prog = 0;
        progressInterval = setInterval(() => {
            prog = Math.min(90, prog + 5);
            window.dynamicIsland.setProgress(prog, `${prog}%`);
        }, 100);
    }

    try {
        // 纯网址：直接以 URL 作为应用源，iframe 加载
        const siteUrl = content.trim();
        if (!/^https?:\/\//i.test(siteUrl)) {
            throw new Error('请输入以 http:// 或 https:// 开头的完整网址');
        }

        if (progressInterval) clearInterval(progressInterval);
        window.dynamicIsland?.setProgress(100, '完成');
        await new Promise(r => setTimeout(r, 500));
        window.dynamicIsland?.idle();
        window.dynamicIsland?.notify({ title: name, subtitle: '已添加至桌面', duration: 2000 });

        const favicon = providedIconUrl || null;
        window.appConfig[appId] = {
            title: name,
            src: siteUrl,
            defaultW: 640,
            defaultH: 480,
            isRemote: true,
            favicon: favicon,
            iconClass: favicon ? null : 'fas fa-globe',
            iconColor: '#007aff'
        };
        addDesktopIcon(appId);
        saveInstalledAppConfig(appId, window.appConfig[appId]);
        saveInstalledApps();
        notifyAppStoreWindows();

        return { siteUrl, appId };
    } catch (err) {
        if (progressInterval) clearInterval(progressInterval);
        window.dynamicIsland?.idle();
        window.dynamicIsland?.notify({ title: '安装失败', subtitle: err.message, duration: 3000 });
        throw err;
    }
}

// ---------- 挂载全局 ----------
function setupGlobalAppFunctions() {
    window.enhancedOpenApp = enhancedOpenApp;
    if (typeof window.openApp !== 'function' || window.openApp.name !== 'enhancedOpenApp') {
        window.openApp = enhancedOpenApp;
    }
}

window.AppStore = {
    install: installApp,
    uninstall: uninstallApp,
    getInstalledIds: getCurrentInstalledIds,
    registerCatalog: registerAvailableApps,
    ensureBuiltinApps: ensureAppStoreAvailable,
    installCustomApp: installCustomAppFromStore,
    enhancedOpenApp: enhancedOpenApp
};

// 初始化
(function initAppStore() {
    ensureAppStoreAvailable();
    setupGlobalAppFunctions();
    restoreInstalledAppsFromStorage();
    window.addEventListener('load', () => {
        restoreInstalledAppsFromStorage();
        notifyAppStoreWindows();
    });
})();