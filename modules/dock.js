

//  - 固定栏（常驻 app）与动态栏（运行中的非固定 app）天然分离，中间以分隔线隔开。
//  - 每个 dock 项结构：动态项由 JS 创建（含 .dock-icon/.dock-label/.dock-indicator/.badge）；
//    固定项为常驻 HTML，缺 indicator/label/badge，运行时不显示小圆点/红点（与原始一致）。
//  - 窗口状态统一存放于 appWindows（appName -> { appName, dockItem, windows:[id] }）。
//  - 对外契约：window.DockManager.{ init, ensureAppIcon, registerWindow, appWindows, updatePlaceholder }
//    订阅事件：appOpened / appClosed / windowFocused
(function () {
    'use strict';

    const DockManager = {

        appWindows: new Map(),   // appName -> { appName, dockItem, windows:[id] }
        fixedApps:   [],          // 固定应用名（不含 trash / launchpad）


        wrapper: null,
        fixedPanel: null,
        dynamicPanel: null,
        placeholder: null,


        init() {
            this.wrapper      = document.querySelector('.dock-wrapper');
            this.fixedPanel   = document.getElementById('dock-panel-fixed');
            this.dynamicPanel = document.getElementById('dock-panel-dynamic');
            this.placeholder  = document.getElementById('dock-placeholder');

            this.initFixedItems();    // 收集固定应用 + 绑定交互
            this.bindAppLifecycle();  // 订阅 appOpened / appClosed / windowFocused
            this.hijackDesktopIcons();// 桌面图标双击/双触打开
            this.enableMagnify();     // 磁吸放大


            setTimeout(() => this.syncExistingWindows(), 100);
            this.updatePlaceholder();
        },


        initFixedItems() {
            if (!this.fixedPanel) return;
            this.fixedPanel.querySelectorAll('.dock-item-fixed[data-app]').forEach(el => {
                const app = el.dataset.app;
                if (app === 'trash') return;        // 废纸篓由其它逻辑处理，不纳入窗口统计
                this.fixedApps.push(app);

                el.addEventListener('click', (e) => { e.stopPropagation(); this.activate(app); });
                el.addEventListener('contextmenu', (e) => this.onContextMenu(e, app));
            });
        },


        ensureDynamicItem(appName) {
            if (!this.dynamicPanel) return null;
            const existing = this.dynamicPanel.querySelector(`.dock-item-dynamic[data-app="${appName}"]`);
            if (existing) return existing;

            const { iconSrc, title, iconClass, iconColor } = this.appMeta(appName);

            const el = document.createElement('div');
            el.className = 'dock-item dock-item-dynamic';
            el.dataset.app = appName;

            // 图标（用 DOM 构建，避免 onerror 内联字符串的转义问题）
            const iconWrap = document.createElement('div');
            iconWrap.className = 'dock-icon';
            if (iconSrc) {
                const img = document.createElement('img');
                img.src = iconSrc;
                img.alt = '';
                img.addEventListener('error', () => {
                    iconWrap.innerHTML = `<i class="${iconClass}" style="font-size:28px; color:${iconColor};"></i>`;
                });
                iconWrap.appendChild(img);
            } else {
                iconWrap.innerHTML = `<i class="${iconClass}" style="font-size:28px; color:${iconColor};"></i>`;
            }

            const label = document.createElement('div');
            label.className = 'dock-label';
            label.textContent = title;

            const ind = document.createElement('div');
            ind.className = 'dock-indicator';

            const badge = document.createElement('div');
            badge.className = 'badge';

            el.append(iconWrap, label, ind, badge);


            if (this.placeholder && this.placeholder.parentNode === this.dynamicPanel) {
                this.dynamicPanel.insertBefore(el, this.placeholder);
            } else {
                this.dynamicPanel.appendChild(el);
            }

            el.addEventListener('click', (e) => { e.stopPropagation(); this.activate(appName); });
            el.addEventListener('contextmenu', (e) => this.onContextMenu(e, appName));
            return el;
        },


        appMeta(appName) {
            const app = (window.appConfig && window.appConfig[appName]) || null;
            const title = (app && app.title) ? app.title : appName;
            const iconClass = (app && app.iconClass) ? app.iconClass : 'fas fa-globe';
            const iconColor = (app && app.iconColor) ? app.iconColor : '#007aff';
            const desktopIcon = document.querySelector(`.desktop-icon[data-app="${appName}"] img`);
            const iconSrc = desktopIcon ? desktopIcon.src : (app && app.favicon ? app.favicon : null);
            return { iconSrc, title, iconClass, iconColor };
        },
        appTitle(appName) { return this.appMeta(appName).title; },


        // 确保动态图标存在（固定应用已常驻，无需创建）
        ensureAppIcon(appName) {
            if (this.fixedApps.includes(appName)) return;
            this.ensureDynamicItem(appName);
        },

        registerWindow(appName, windowId) {
            if (!appName || !windowId) return;
            let entry = this.appWindows.get(appName);
            if (!entry) {
                entry = { appName, dockItem: this.getItemEl(appName), windows: [] };
                if (!entry.dockItem && !this.fixedApps.includes(appName)) {
                    entry.dockItem = this.ensureDynamicItem(appName);
                }
                this.appWindows.set(appName, entry);
            }
            if (!entry.windows.includes(windowId)) entry.windows.push(windowId);
            this.updateIndicator(appName);
            this.updatePlaceholder();
        },

        unregisterWindow(appName, windowId) {
            if (!appName || !windowId) return;
            const entry = this.appWindows.get(appName);
            if (!entry) return;
            entry.windows = entry.windows.filter(id => id !== windowId);
            if (entry.windows.length === 0) {
                if (!this.fixedApps.includes(appName) && entry.dockItem) {

                    const node = entry.dockItem;
                    node.classList.add('removing');
                    setTimeout(() => node.remove(), 300);
                } else if (entry.dockItem) {
                    // 固定应用：仅熄灭指示点，保留常驻项
                    this.setIndicator(entry.dockItem, false);
                }
                this.appWindows.delete(appName);
            } else {
                this.updateIndicator(appName);
            }
            this.updatePlaceholder();
        },


        lookup(appName) {
            return this.appWindows.get(appName) || null;
        },
        getItemEl(appName) {
            return this.wrapper
                ? this.wrapper.querySelector(`.dock-item[data-app="${appName}"]`)
                : null;
        },
        setIndicator(el, on) {
            const ind = el && el.querySelector('.dock-indicator');
            if (ind) ind.classList.toggle('active', !!on);
        },
        updateIndicator(appName) {
            const entry = this.lookup(appName);
            if (!entry || !entry.dockItem) return;
            this.setIndicator(entry.dockItem, entry.windows.length > 0);
        },
        setActiveApp(appName) {
            document.querySelectorAll('.dock-item-active').forEach(e => e.classList.remove('dock-item-active'));
            const entry = this.lookup(appName);
            if (entry && entry.dockItem) entry.dockItem.classList.add('dock-item-active');
        },


        // 点击：固定项聚焦/恢复，动态项最小化/恢复；无窗口则打开
        activate(appName) {
            const entry = this.lookup(appName);
            if (!entry || entry.windows.length === 0) {
                if (window.openApp) window.openApp(appName);
                return;
            }
            const wins = (window.windows || []).filter(w => entry.windows.includes(w.id));
            const allMin = wins.length > 0 && wins.every(w => w.minimized);
            if (allMin) {
                wins.forEach(w => window.restoreWindow?.(w));
                return;
            }
            if (this.fixedApps.includes(appName)) {
                const active = wins.find(w => !w.minimized);
                if (active) window.focusWindow?.(active);
            } else {
                wins.forEach(w => window.minimizeWindow?.(w));
            }
        },

        async onContextMenu(e, appName) {
            e.preventDefault();
            const entry = this.lookup(appName);
            if (!entry || entry.windows.length === 0) return;
            if (await window.MacOSDialog?.confirm({
                title: '关闭窗口',
                message: `关闭“${this.appTitle(appName)}”的所有窗口吗？`
            })) {
                this.closeAppWindows(appName);
            }
        },

        closeAppWindows(appName) {
            const entry = this.lookup(appName);
            if (!entry) return;
            const wins = (window.windows || []).filter(w => entry.windows.includes(w.id));
            wins.forEach(w => window.closeWindow?.(w));
        },


        bindAppLifecycle() {
            window.addEventListener('appOpened', (e) => {
                const { appName, windowId } = e.detail || {};
                this.registerWindow(appName, windowId);
            });
            window.addEventListener('appClosed', (e) => {
                const { appName, windowId } = e.detail || {};
                this.unregisterWindow(appName, windowId);
            });
            window.addEventListener('windowFocused', (e) => {
                if (e.detail && e.detail.appName) this.setActiveApp(e.detail.appName);
            });
        },


        hijackDesktopIcons() {
            const bind = () => {
                document.querySelectorAll('.desktop-icon[data-app]').forEach(icon => {
                    if (icon.getAttribute('data-dock-bound') === 'true') return;
                    icon.setAttribute('data-dock-bound', 'true');
                    const appName = icon.getAttribute('data-app');
                    if (!appName) return;

                    icon.addEventListener('dblclick', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.openApp) window.openApp(appName);
                    });

                    let lastTap = 0;
                    icon.addEventListener('touchstart', (e) => {
                        const now = Date.now();
                        if (now - lastTap < 300) {
                            e.preventDefault();
                            if (window.openApp) window.openApp(appName);
                            lastTap = 0;
                        } else {
                            lastTap = now;
                        }
                    });
                });
            };
            bind();
            const observer = new MutationObserver(() => bind());
            observer.observe(document.body, { childList: true, subtree: true });
        },

        syncExistingWindows() {
            (window.windows || []).forEach(win => {
                if (win.app && win.dom && document.body.contains(win.dom)) {
                    this.registerWindow(win.app, win.id);
                }
            });
        },


        updatePlaceholder() {
            if (!this.placeholder) return;
            const hasDynamic = this.dynamicPanel &&
                this.dynamicPanel.querySelectorAll('.dock-item-dynamic').length > 0;
            this.placeholder.style.display = hasDynamic ? 'none' : 'flex';
            if (this.dynamicPanel) {
                this.dynamicPanel.style.display = hasDynamic ? 'flex' : 'none';
            }
        },


        enableMagnify() {
            const wrapper = this.wrapper;
            if (!wrapper) return;

            // 存在触屏的设备：点按会模拟 mouse 事件 / hover 粘滞，禁用鱼眼放大
            if (window.matchMedia && window.matchMedia('(any-pointer: coarse)').matches) return;

            const DIST_MULT = 6;        // distanceLimit = baseWidth * 6（同 puruvj）
            const STIFFNESS = 0.12;     // 弹簧刚度（同 puruvj spring stiffness）
            const DAMPING   = 0.47;     // 弹簧阻尼（欠阻尼，带回弹，同 puruvj）

            // 倍率控制点（中心 2× → 远端 1×），与 puruvj widthOutput 比例一致
            const factorOutput = [1, 1.1, 1.414, 2, 1.414, 1.1, 1];

            // 非等距分段线性插值（等价于 popmotion interpolate）
            const interp = (xs, ys, x) => {
                const n = xs.length;
                if (x <= xs[0]) return ys[0];
                if (x >= xs[n - 1]) return ys[n - 1];
                for (let i = 0; i < n - 1; i++) {
                    if (x >= xs[i] && x <= xs[i + 1]) {
                        const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
                        return ys[i] + (ys[i + 1] - ys[i]) * t;
                    }
                }
                return ys[n - 1];
            };

            // 简易弹簧（velocity 积分，行为接近 svelte/motion 的 spring）
            const makeSpring = (init) => ({
                value: init, vel: 0, target: init,
                set(t) { this.target = t; },
                step() {

const accel = STIFFNESS * (this.target - this.value) - DAMPING * this.vel;
                    this.vel += accel;
                    this.value += this.vel;
                }
            });

            const stateMap = new Map();
            let mouseX = null;
            let raf = null;
            let xs = null;            // 距离控制点（基于实测 baseWidth 计算）

            const tick = () => {
                if (mouseX === null) { raf = null; return; }
                const els = Array.from(wrapper.querySelectorAll('.dock-item'));

                // 1) 清空 inline 宽度，回到未放大布局，读取稳定中心与基础宽度
                els.forEach(el => { el.style.width = ''; el.style.flex = ''; });
                const bases = els.map(el => {
                    const r = el.getBoundingClientRect();
                    return { cx: r.left + r.width / 2, bw: r.width };
                });

                // 首次：用平均项宽确定基准与距离控制点
                if (!xs) {
                    const base = bases.reduce((s, b) => s + b.bw, 0) / (bases.length || 1) || 56;
                    const L = base * DIST_MULT;
                    xs = [-L, -L / 1.25, -L / 2, 0, L / 2, L / 1.25, L];
                }

                // 2) 计算目标倍率 → 目标宽度，并用弹簧平滑
                let moving = false;
                els.forEach((el, i) => {
                    const st = stateMap.get(el) || makeSpring(bases[i].bw);
                    const dist = Math.abs(mouseX - bases[i].cx);
                    const target = bases[i].bw * interp(xs, factorOutput, dist);
                    st.set(target);
                    st.step();
                    const w = st.value;
                    // 改宽度即可（aspect-ratio:1/1 自动等比放大高度与图标，flex 自动推开邻居）
                    el.style.flex = '0 0 ' + w.toFixed(2) + 'px';
                    el.style.width = w.toFixed(2) + 'px';
                    stateMap.set(el, st);
                    if (Math.abs(target - w) > 0.01 || Math.abs(st.vel) > 0.001) moving = true;
                });

                raf = moving ? requestAnimationFrame(tick) : null;
            };

            wrapper.addEventListener('mouseenter', () => wrapper.classList.add('dock-magnifying'));
            wrapper.addEventListener('mousemove', (e) => {
                mouseX = e.clientX;
                if (!raf) raf = requestAnimationFrame(tick);
            });
            wrapper.addEventListener('mouseleave', () => {
                mouseX = null;
                wrapper.classList.remove('dock-magnifying');
                wrapper.querySelectorAll('.dock-item').forEach(el => {
                    el.style.width = '';
                    el.style.flex = '';
                });
                stateMap.clear();
                if (raf) { cancelAnimationFrame(raf); raf = null; }
            });
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DockManager.init());
    } else {
        DockManager.init();
    }
    window.DockManager = DockManager;
})();
