
(function() {
    const overlay = document.getElementById('launchpad-overlay');
    const searchInput = document.getElementById('launchpad-search');
    const grid = document.getElementById('launchpad-grid');
    const dockTriggers = document.querySelectorAll('[data-launchpad="true"]');
    if (!overlay || !grid) return;

    let appList = [];
    let isOpen = false;

function collectApps() {
        const map = new Map();
        const push = (app, title, iconSrc, iconClass, iconColor) => {
            if (!map.has(app)) {
                map.set(app, { app, title, iconSrc, iconClass, iconColor });
            }
        };

        // 1. 桌面图标（带真实 webp 图标）
        document.querySelectorAll('.desktop-icon[data-app]').forEach(el => {
            const app = el.dataset.app;
            const title = el.querySelector('span')?.textContent?.trim() || app;
            const img = el.querySelector('img');
            const i = el.querySelector('i');
            push(app, title,
                img ? img.getAttribute('src') : null,
                i ? i.className : 'fas fa-globe',
                i ? (i.style.color || '#007aff') : '#007aff');
        });

        // 2. 固定 Dock 项（桌面没有的，如废纸篓除外 launchpad 不显示垃圾篓）
        document.querySelectorAll('.dock-item-fixed[data-app]').forEach(el => {
            const app = el.dataset.app;
            if (app === 'trash') return;
            const title = el.getAttribute('title') || app;
            const img = el.querySelector('img');
            const i = el.querySelector('i');
            push(app, title,
                img ? img.getAttribute('src') : null,
                i ? i.className : 'fas fa-cube',
                i ? (i.style.color || '#8e8e93') : '#8e8e93');
        });

const cfg = window.appConfig || {};
        Object.keys(cfg).forEach(app => {
            if (app === 'trash') return;
            const c = cfg[app];
            push(app, c.title || app, null, c.iconClass || 'fas fa-globe', c.iconColor || '#007aff');
        });

        appList = Array.from(map.values());
    }

    function launch(app) {
        close();
        if (window.openApp) {
            // 延迟一帧，等 Launchpad 收起动画开始后再开窗口
            setTimeout(() => window.openApp(app), 150);
        }
    }

    function render(filter) {
        const q = (filter || '').trim().toLowerCase();
        const list = q
            ? appList.filter(a => (a.title + ' ' + a.app).toLowerCase().includes(q))
            : appList;
        grid.innerHTML = '';
        list.forEach(a => {
            const cell = document.createElement('div');
            cell.className = 'launchpad-cell';
            const iconHtml = a.iconSrc
                ? `<img src="${a.iconSrc}" alt="" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                : '';
            const iconFallback = `<i class="${a.iconClass}" style="display:${a.iconSrc ? 'none' : 'flex'};color:${a.iconColor};"></i>`;
            cell.innerHTML = `
                <div class="launchpad-icon">${iconHtml}${iconFallback}</div>
                <div class="launchpad-name">${a.title}</div>
            `;
            cell.addEventListener('click', () => launch(a.app));
            grid.appendChild(cell);
        });
    }

    function open() {
        collectApps();
        isOpen = true;
        searchInput.value = '';
        overlay.classList.add('show');
        overlay.setAttribute('aria-hidden', 'false');
        render('');
        requestAnimationFrame(() => searchInput.focus());
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
        searchInput.blur();
    }

    // Dock 图标触发
    dockTriggers.forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            open();
        });
    });

    // 点空白处关闭
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    // 搜索过滤
    searchInput.addEventListener('input', () => render(searchInput.value));

    // 键盘：Esc 关闭
    window.addEventListener('keydown', (e) => {
        if (!isOpen) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }
    });
})();