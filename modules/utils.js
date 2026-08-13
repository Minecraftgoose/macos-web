
function getMenuBarHeight() {
    const menuBar = document.querySelector('.menu-bar');
    return menuBar ? menuBar.offsetHeight : 28;
}

function getDockHeight() {
    const dockWrapper = document.querySelector('.dock-wrapper');
    if (!dockWrapper) return 78;
    return dockWrapper.getBoundingClientRect().height;
}

// 拖拽不再计算 Dock / 菜单栏边界：允许窗口自由移动（含完全移出屏幕）
function applyDragBoundaries(winDiv, newLeft, newTop) {
    return { newLeft, newTop };
}

function applyResizeBoundaries(winDiv, newLeft, newTop, newWidth, newHeight, dir = '') {
    const menuH = getMenuBarHeight();
    const minWidth = parseFloat(getComputedStyle(winDiv).minWidth) || 450;
    const minHeight = parseFloat(getComputedStyle(winDiv).minHeight) || 350;
    const maxRight = window.innerWidth;
    const maxBottom = window.innerHeight;
    let left = newLeft;
    let top = newTop;
    let width = newWidth;
    let height = newHeight;

    // 拖动左/上把手时，对应的右/下边缘保持固定，借此约束活动边缘的最大值
    const rightFixed = left + width;   // 仅 'w' 方向有意义（右边缘不动）
    const bottomFixed = top + height;  // 仅 'n' 方向有意义（下边缘不动）

    // 水平方向
    if (dir.includes('w')) {
        // 左边缘移动、右边缘固定：保证宽度 >= minWidth 且左边缘落在屏幕内
        width = Math.max(minWidth, width);
        left = rightFixed - width;
        if (rightFixed > maxRight) { width = maxRight - left; }
        if (left < 0) { left = 0; width = Math.min(width, rightFixed - left); }
    } else if (dir.includes('e')) {
        // 右边缘移动、左边缘固定
        width = Math.max(minWidth, width);
        left = Math.max(0, left);
        if (left + width > maxRight) width = maxRight - left;
    }

    // 垂直方向
    if (dir.includes('n')) {
        // 上边缘移动、下边缘固定：保证高度 >= minHeight 且上边缘落在菜单栏下方
        height = Math.max(minHeight, height);
        top = bottomFixed - height;
        if (bottomFixed > maxBottom) { height = maxBottom - top; }
        if (top < menuH) { top = menuH; height = Math.min(height, bottomFixed - top); }
    } else if (dir.includes('s')) {
        // 下边缘移动、上边缘固定
        height = Math.max(minHeight, height);
        top = Math.max(menuH, top);
        if (top + height > maxBottom) height = maxBottom - top;
    }

    return { left, top, width, height };
}

let resizeFrame = null;
function notifyResize(winObj) {
    const iframe = winObj.dom.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
        const rect = winObj.dom.querySelector('.window-content').getBoundingClientRect();
        iframe.contentWindow.postMessage({ type: 'resize', width: rect.width, height: rect.height }, '*');
    }
}
function notifyResizeThrottled(winObj) {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
        notifyResize(winObj);
        resizeFrame = null;
    });
}

function syncDarkModeToWindow(winObj) {
    if (winObj.app === 'about') {
        const iframe = winObj.dom.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            const isDark = document.body.classList.contains('dark-mode');
            iframe.contentWindow.postMessage({ type: 'darkMode', enabled: isDark }, '*');
        }
    }
}

function getWindowsByApp(app) {
    // 先清理掉 DOM 已经被 remove() 的幽灵窗口
    window.windows = (window.windows || []).filter(w => w.dom && document.body.contains(w.dom));
    return window.windows.filter(w => w.app === app);
}