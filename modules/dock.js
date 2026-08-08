// ========== dock.js - Dock 栏（固定图标、动态图标、磁吸放大） ==========
(function() {
    const DockManager = {
        // 记录所有应用的窗口信息（包括固定和动态）
        appWindows: new Map(),   // key: appName, value: { windows: [id, ...], dockItem: DOM|null, isFixed: bool }
        fixedApps: [],
        
        init() {
            this.dynamicPanel = document.getElementById('dock-panel-dynamic');
            this.placeholder = document.getElementById('dock-placeholder');
            this.fixedPanel = document.getElementById('dock-panel-fixed');
            
            // 动态面板显隐统一交给 updatePlaceholder()（默认隐藏，有动态应用才显示）
            // 注意：不能靠 CSS 强 display:flex，否则会压住 JS 的 none
            this.detectFixedApps();
            this.bindEvents();
            this.hijackDesktopIcons();
            this.initFixedDock();
            
            setTimeout(() => this.syncExistingWindows(), 100);
            this.enableMagnify();
            this.updatePlaceholder();
        },

        
        /* ========== 真实 macOS 磁吸放大（平滑版） ==========
           每帧先清除所有 transform 再读布局位置(排除放大干扰)，
           距离计算基于未放大的布局中心；目标值用 lerp 平滑插值。 */
        enableMagnify() {
            const wrapper = document.querySelector('.dock-wrapper');
            if (!wrapper) return;
            const MAX_DIST = 130;
            const MAX_SCALE = 1.48;
            const EASE = 0.3;
            const stateMap = new Map();
            let mouseX = null;
            let raf = null;

            const tick = () => {
                if (mouseX === null) { raf = null; return; }
                const els = Array.from(wrapper.querySelectorAll('.dock-item'));
                els.forEach(el => { el.style.transform = ''; });
                const rects = els.map(el => {
                    const r = el.getBoundingClientRect();
                    return { cx: r.left + r.width / 2, w: r.width };
                });
                const scales = els.map((el, i) => {
                    const dist = Math.abs(mouseX - rects[i].cx);
                    return dist > MAX_DIST ? 1 : 1 + (MAX_SCALE - 1) * (1 - dist / MAX_DIST);
                });
                const panels = els.map(el => el.closest('.dock-panel-fixed') ? 'fixed' : 'dynamic');
                const pushes = [];
                for (let i = 0; i < els.length; i++) {
                    let push = 0;
                    for (let j = 0; j < els.length; j++) {
                        if (i === j) continue;
                        if (panels[i] !== panels[j]) continue;
                        const dir = i > j ? 1 : -1;
                        const jExpand = (scales[j] - 1) * rects[j].w * 0.5;
                        const iExpand = (scales[i] - 1) * rects[i].w * 0.5;
                        push += (jExpand + iExpand * 0.6) * dir;
                    }
                    pushes.push(push);
                }
                let moving = false;
                els.forEach((el, i) => {
                    const st = stateMap.get(el) || { scale: 1, x: 0 };
                    const targetScale = scales[i];
                    const targetX = pushes[i];
                    st.scale += (targetScale - st.scale) * EASE;
                    st.x += (targetX - st.x) * EASE;
                    if (Math.abs(targetScale - st.scale) > 0.002 || Math.abs(targetX - st.x) > 0.2) moving = true;
                    el.style.transform = 'translateX(' + st.x.toFixed(1) + 'px) scale(' + st.scale.toFixed(3) + ')';
                    stateMap.set(el, st);
                });
                raf = moving ? requestAnimationFrame(tick) : null;
            };

            wrapper.addEventListener('mouseenter', () => {
                wrapper.classList.add('dock-magnifying');
            });
            wrapper.addEventListener('mousemove', (e) => {
                mouseX = e.clientX;
                if (!raf) raf = requestAnimationFrame(tick);
            });
            wrapper.addEventListener('mouseleave', () => {
                mouseX = null;
                wrapper.classList.remove('dock-magnifying');
                wrapper.querySelectorAll('.dock-item').forEach(el => { el.style.transform = ''; });
                stateMap.clear();
                if (raf) { cancelAnimationFrame(raf); raf = null; }
            });
        },

        detectFixedApps() {
            if (!this.fixedPanel) return;
            this.fixedApps = Array.from(this.fixedPanel.querySelectorAll('.dock-item-fixed[data-app]'))
                .map(el => el.dataset.app);
        },
        
        bindEvents() {
            window.addEventListener('appOpened', (e) => {
                const { appName, windowId } = e.detail;
                this.registerWindow(appName, windowId);
            });
            
            window.addEventListener('appClosed', (e) => {
                const { appName, windowId } = e.detail;
                this.unregisterWindow(appName, windowId);
            });
            
            window.addEventListener('windowFocused', (e) => {
                this.setActiveApp(e.detail.appName);
            });
        },
        
        // 确保应用图标存在（非固定应用创建动态图标，固定应用不做任何事）
        ensureAppIcon(appName) {
            if (this.fixedApps.includes(appName)) {
                // 固定应用不需要创建动态图标，但确保其指示器存在
                return;
            }
            // 非固定应用：创建动态图标（如果尚未创建）
            this.addDynamicIcon(appName);
        },
        
        registerWindow(appName, windowId) {
            let entry = this.appWindows.get(appName);
            if (!entry) {
                const isFixed = this.fixedApps.includes(appName);
                let dockItem = null;
                if (isFixed) {
                    dockItem = this.fixedPanel?.querySelector(`.dock-item-fixed[data-app="${appName}"]`) || null;
                } else {
                    dockItem = this.dynamicPanel?.querySelector(`.dock-item-dynamic[data-app="${appName}"]`) || null;
                }
                entry = { windows: [], dockItem: dockItem, isFixed: isFixed };
                this.appWindows.set(appName, entry);
            }
            if (!entry.windows.includes(windowId)) {
                entry.windows.push(windowId);
            }
            // 如果 dockItem 丢失，重新获取
            if (!entry.dockItem) {
                if (entry.isFixed) {
                    entry.dockItem = this.fixedPanel?.querySelector(`.dock-item-fixed[data-app="${appName}"]`) || null;
                } else {
                    entry.dockItem = this.dynamicPanel?.querySelector(`.dock-item-dynamic[data-app="${appName}"]`) || null;
                }
            }
            this.updateIndicator(appName);
            this.updatePlaceholder();
        },
        
        unregisterWindow(appName, windowId) {
            const entry = this.appWindows.get(appName);
            if (!entry) return;
            entry.windows = entry.windows.filter(id => id !== windowId);
            if (entry.windows.length === 0) {
                // 熄灭固定应用的指示器（动态应用直接移除图标，无需单独熄灯）
                if (entry.isFixed && entry.dockItem) {
                    const indicator = entry.dockItem.querySelector('.dock-indicator');
                    if (indicator) {
                        indicator.classList.remove('active');
                        indicator.style.display = 'none';
                    }
                }
                // 如果是动态应用，移除动态图标
                if (!entry.isFixed && entry.dockItem) {
                    entry.dockItem.remove();
                }
                this.appWindows.delete(appName);
            } else {
                this.updateIndicator(appName);
            }
            this.updatePlaceholder();
        },
        
        setActiveApp(appName) {
            // 清除所有高亮
            document.querySelectorAll('.dock-item').forEach(item => item.classList.remove('dock-item-active'));
            const entry = this.appWindows.get(appName);
            if (entry && entry.dockItem) {
                entry.dockItem.classList.add('dock-item-active');
            }
        },
        
        updateIndicator(appName) {
            const entry = this.appWindows.get(appName);
            if (!entry) return;
            // 确保 dockItem 有效
            if (!entry.dockItem) {
                if (entry.isFixed) {
                    entry.dockItem = this.fixedPanel?.querySelector(`.dock-item-fixed[data-app="${appName}"]`) || null;
                } else {
                    entry.dockItem = this.dynamicPanel?.querySelector(`.dock-item-dynamic[data-app="${appName}"]`) || null;
                }
            }
            const indicator = entry.dockItem?.querySelector('.dock-indicator');
            if (indicator) {
                const hasWindows = entry.windows.length > 0;
                indicator.classList.toggle('active', hasWindows);
                indicator.style.display = 'block';
            }
        },
        
        addDynamicIcon(appName) {
            if (!this.dynamicPanel) return;
            // 如果已经存在，更新关联并刷新指示器
            const existing = this.dynamicPanel.querySelector(`.dock-item-dynamic[data-app="${appName}"]`);
            if (existing) {
                const entry = this.appWindows.get(appName);
                if (entry) {
                    entry.dockItem = existing;
                    this.updateIndicator(appName);
                }
                return;
            }
            
            const app = window.appConfig ? window.appConfig[appName] : null;
            const title = (app && app.title) ? app.title : appName;
            const iconClass = (app && app.iconClass) ? app.iconClass : 'fas fa-globe';
            const iconColor = (app && app.iconColor) ? app.iconColor : '#007aff';
            
            // 获取图标图片源：桌面图标图片 → app.favicon
            const desktopIcon = document.querySelector(`.desktop-icon[data-app="${appName}"] img`);
            const iconSrc = desktopIcon ? desktopIcon.src : (app && app.favicon ? app.favicon : null);
            
            const dockItem = document.createElement('div');
            dockItem.className = 'dock-item dock-item-dynamic';
            dockItem.dataset.app = appName;
            
            let iconHtml;
            if (iconSrc) {
                iconHtml = `<img src="${iconSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\'${iconClass}\' style=\'font-size:28px;color:${iconColor};\'></i>';">`;
            } else {
                iconHtml = `<i class="${iconClass}" style="font-size:28px; color:${iconColor};"></i>`;
            }
            
            dockItem.innerHTML = `
                <div class="dock-icon" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%;">
                    ${iconHtml}
                </div>
                <div class="dock-label">${title}</div>
                <div class="dock-indicator"></div>
            `;
            
            // 点击：切换窗口最小化/恢复
            dockItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleAppWindows(appName);
            });
            
            // 右键：关闭所有窗口
            dockItem.addEventListener('contextmenu', async (e) => {
                e.preventDefault();
                if (await window.MacOSDialog?.confirm({ title: '关闭窗口', message: `关闭“${title}”的所有窗口吗？` })) {
                    this.closeAppWindows(appName);
                }
            });
            
            // 插入面板（在占位符之前）
            if (this.placeholder && this.placeholder.parentNode === this.dynamicPanel) {
                this.dynamicPanel.insertBefore(dockItem, this.placeholder);
            } else {
                this.dynamicPanel.appendChild(dockItem);
            }
            
            // 更新 appWindows 中的关联
            let entry = this.appWindows.get(appName);
            if (!entry) {
                entry = { windows: [], dockItem: dockItem, isFixed: false };
                this.appWindows.set(appName, entry);
            } else {
                entry.dockItem = dockItem;
            }
            
            this.updateIndicator(appName);
            this.updatePlaceholder();
        },
        
        toggleAppWindows(appName) {
            const entry = this.appWindows.get(appName);
            if (!entry || entry.windows.length === 0) return;
            const wins = (window.windows || []).filter(w => entry.windows.includes(w.id));
            const allMinimized = wins.length > 0 && wins.every(w => w.minimized);
            if (allMinimized) {
                wins.forEach(w => window.restoreWindow?.(w));
            } else {
                wins.forEach(w => window.minimizeWindow?.(w));
            }
        },
        
        closeAppWindows(appName) {
            const entry = this.appWindows.get(appName);
            if (!entry) return;
            const wins = (window.windows || []).filter(w => entry.windows.includes(w.id));
            wins.forEach(w => window.closeWindow?.(w));
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
            const wins = window.windows || [];
            wins.forEach(win => {
                if (win.app && win.dom && document.body.contains(win.dom)) {
                    // 确保窗口被注册（无论是固定还是动态）
                    this.registerWindow(win.app, win.id);
                }
            });
        },
        
        updatePlaceholder() {
            if (!this.placeholder) return;
            // 检查是否有任何动态图标
            const hasDynamicIcons = this.dynamicPanel && this.dynamicPanel.querySelectorAll('.dock-item-dynamic').length > 0;
            this.placeholder.style.display = hasDynamicIcons ? 'none' : 'flex';
            // 动态面板：有应用时显示，无应用时隐藏
            if (this.dynamicPanel) {
                this.dynamicPanel.style.display = hasDynamicIcons ? 'flex' : 'none';
            }
        },
        
        initFixedDock() {
            if (!this.fixedPanel) return;
            this.fixedPanel.querySelectorAll('.dock-item-fixed[data-app]').forEach(item => {
                const app = item.dataset.app;
                if (!app || app === 'trash') return;
                // 点击固定应用打开（或切换窗口）
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // 如果已经打开，则激活/恢复；否则打开
                    const entry = this.appWindows.get(app);
                    if (entry && entry.windows.length > 0) {
                        // 有窗口：如果最小化则恢复，否则聚焦
                        const wins = (window.windows || []).filter(w => entry.windows.includes(w.id));
                        const allMinimized = wins.every(w => w.minimized);
                        if (allMinimized) {
                            wins.forEach(w => window.restoreWindow?.(w));
                        } else {
                            // 聚焦第一个未最小化的窗口
                            const activeWin = wins.find(w => !w.minimized);
                            if (activeWin) window.focusWindow?.(activeWin);
                        }
                    } else {
                        if (window.openApp) window.openApp(app);
                    }
                });
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