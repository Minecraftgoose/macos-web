/* 动态日历图标：加载时用 canvas 实时绘制 macOS 风格日历图标（白卡片 + 红色星期 + 黑色当天日期），
   替换页面中所有日历图标 <img> 的 src。刷新页面即得到当天日期，无需静态图片。 */
(function () {
    'use strict';

    const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const S = 240; // 2x 于 120 设计稿，缩放更清晰
    // 苹方字体内嵌于 css/fonts.css（woff2），优先使用；其余为 Windows/其他平台 fallback
    const FONT_STACK = '"PingFang SC", -apple-system, "SF Pro Display", "Helvetica Neue", "Segoe UI", sans-serif';

    function renderCalendarIcon() {
        const canvas = document.createElement('canvas');
        canvas.width = S;
        canvas.height = S;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 圆角白色卡片
        const r = 48;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.arcTo(S, 0, S, S, r);
        ctx.arcTo(S, S, 0, S, r);
        ctx.arcTo(0, S, 0, 0, r);
        ctx.arcTo(0, 0, S, 0, r);
        ctx.closePath();
        ctx.fillStyle = '#f6f6f6';
        ctx.fill();

        const now = new Date();
        const week = WEEK[now.getDay()];
        const day = String(now.getDate());

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // 红色星期
        ctx.font = '600 54px ' + FONT_STACK;
        ctx.fillStyle = '#ff3b30';
        ctx.fillText(week, S / 2, 28);

        // 黑色当天日期
        ctx.font = '500 144px ' + FONT_STACK;
        ctx.fillStyle = '#0c0c0c';
        try { ctx.letterSpacing = '-12px'; } catch (e) { /* 老浏览器忽略 */ }
        ctx.fillText(day, S / 2, 88);

        try { return canvas.toDataURL('image/png'); } catch (e) { return null; }
    }

    let cachedURL = null;
    function getDataURL() {
        if (!cachedURL) cachedURL = renderCalendarIcon();
        return cachedURL;
    }

    // 预加载苹方字体的两个字重（@font-face 异步加载，不等待会 fallback 到系统字体）
    function loadFonts() {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        return Promise.all([
            document.fonts.load('600 54px "PingFang SC"'),
            document.fonts.load('500 144px "PingFang SC"')
        ]).catch(() => { });
    }

    function apply() {
        loadFonts().then(() => {
            const url = getDataURL();
            if (!url) return;
            document.querySelectorAll('img[alt="日历"]').forEach(img => {
                img.src = url;
                img.style.display = '';
            });
        });
    }

    // 暴露给其他模块（launchpad 等可按需复用）
    window.CalendarIcon = { getDataURL };

    apply();

    // 跨天自动更新日期
    let lastKey = new Date().toDateString();
    const check = () => {
        const key = new Date().toDateString();
        if (key !== lastKey) {
            lastKey = key;
            cachedURL = null;
            apply();
        }
    };
    setInterval(check, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
})();
