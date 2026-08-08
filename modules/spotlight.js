// ========== spotlight.js - 顶部菜单栏放大镜 → Spotlight 搜索 ==========
(function() {
    const trigger = document.getElementById('spotlight-trigger');
    const overlay = document.getElementById('spotlight-overlay');
    const input = document.getElementById('spotlight-input');
    const results = document.getElementById('spotlight-results');
    if (!trigger || !overlay || !input) return;

    let appList = [];
    let filtered = [];
    let selectedIdx = 0;

    function collectApps() {
        const map = new Map();
        // 桌面图标
        document.querySelectorAll('.desktop-icon[data-app]').forEach(el => {
            const name = el.dataset.app;
            const title = el.querySelector('span')?.textContent?.trim() || name;
            const img = el.querySelector('img');
            map.set(name, {
                app: name,
                title,
                iconSrc: img ? img.getAttribute('src') : null,
                iconClass: el.querySelector('i')?.className || 'fas fa-globe',
                iconColor: el.querySelector('i')?.style?.color || '#007aff'
            });
        });
        // 固定 dock 中桌面图标没有的（比如 trash）
        document.querySelectorAll('.dock-item-fixed[data-app]').forEach(el => {
            const name = el.dataset.app;
            if (!map.has(name)) {
                const title = el.getAttribute('title') || name;
                const img = el.querySelector('img');
                map.set(name, {
                    app: name,
                    title,
                    iconSrc: img ? img.getAttribute('src') : null,
                    iconClass: el.querySelector('i')?.className || 'fas fa-cube',
                    iconColor: el.querySelector('i')?.style?.color || '#8e8e93'
                });
            }
        });
        appList = Array.from(map.values());
    }

    function renderResults() {
        const q = input.value.trim().toLowerCase();
        if (!q) {
            filtered = appList.slice();
        } else {
            // 简单子串匹配 + 拼音首字母兜底（不做完整拼音库，仅英文/标题/应用名）
            filtered = appList.filter(app => {
                const hay = (app.title + ' ' + app.app).toLowerCase();
                return hay.includes(q);
            });
        }
        if (selectedIdx >= filtered.length) selectedIdx = Math.max(0, filtered.length - 1);
        results.innerHTML = '';
        if (filtered.length === 0) {
            results.innerHTML = '<div class="spotlight-empty">没有匹配的应用</div>';
            return;
        }
        filtered.slice(0, 8).forEach((app, i) => {
            const row = document.createElement('div');
            row.className = 'spotlight-item' + (i === selectedIdx ? ' selected' : '');
            const iconHtml = app.iconSrc
                ? `<img src="${app.iconSrc}" alt="" onerror="this.style.display='none'">`
                : `<i class="${app.iconClass}" style="color:${app.iconColor};font-size:22px;"></i>`;
            row.innerHTML = `
                <div class="spotlight-item-icon">${iconHtml}</div>
                <div class="spotlight-item-text">
                    <div class="spotlight-item-title">${app.title}</div>
                    <div class="spotlight-item-sub">应用程序</div>
                </div>
            `;
            row.addEventListener('click', () => launch(app));
            row.addEventListener('mouseenter', () => {
                selectedIdx = i;
                updateSelection();
            });
            results.appendChild(row);
        });
    }

    function updateSelection() {
        results.querySelectorAll('.spotlight-item').forEach((el, i) => {
            el.classList.toggle('selected', i === selectedIdx);
        });
    }

    function launch(app) {
        close();
        if (window.openApp) {
            window.openApp(app.app);
        }
    }

    function open() {
        collectApps();
        selectedIdx = 0;
        input.value = '';
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
        renderResults();
        // 强制下一帧聚焦，避免动画被打断
        requestAnimationFrame(() => input.focus());
    }

    function close() {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
        input.blur();
    }

    // 触发
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        open();
    });
    trigger.style.cursor = 'pointer';

    // 点遮罩关闭（点 spotlight-box 本身不关）
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    // 全局快捷键：Cmd/Ctrl + Space
    window.addEventListener('keydown', (e) => {
        const isMac = navigator.platform.toLowerCase().includes('mac');
        const accel = isMac ? e.metaKey : e.ctrlKey;
        if (accel && e.code === 'Space') {
            e.preventDefault();
            if (overlay.classList.contains('show')) close();
            else open();
            return;
        }
        if (!overlay.classList.contains('show')) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filtered.length > 0) {
                selectedIdx = (selectedIdx + 1) % Math.min(filtered.length, 8);
                updateSelection();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filtered.length > 0) {
                selectedIdx = (selectedIdx - 1 + Math.min(filtered.length, 8)) % Math.min(filtered.length, 8);
                updateSelection();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[selectedIdx]) launch(filtered[selectedIdx]);
        }
    });

    // 输入即时搜索
    input.addEventListener('input', () => {
        selectedIdx = 0;
        renderResults();
    });
})();