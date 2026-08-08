// ========== 控制中心 ==========
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildControlCenter);
    } else {
        buildControlCenter();
    }

    function buildControlCenter() {
        const cc = document.getElementById('control-center');
        const trigger = document.getElementById('control-center-trigger');
        const closeBtn = document.getElementById('cc-close-btn');
        if (!cc) return;

        const oldGrid = cc.querySelector('.cc-grid');
        const oldFooter = cc.querySelector('.cc-footer');
        if (oldGrid) oldGrid.remove();
        if (oldFooter) oldFooter.remove();

        const grid = document.createElement('div');
        grid.className = 'cc-grid';

        const iconModules = [
            { id: 'wifi', label: '无线局域网', icon: 'fas fa-wifi', defaultState: 'on' },
            { id: 'focus', label: '专注模式', icon: 'fas fa-moon', defaultState: 'off' },
            { id: 'darkmode', label: '深色模式', icon: 'fas fa-adjust', defaultState: 'off' }
        ];

        iconModules.forEach(mod => {
            const moduleDiv = document.createElement('div');
            moduleDiv.className = 'icon-module';
            if (mod.defaultState === 'on') moduleDiv.classList.add('active');
            moduleDiv.setAttribute('data-id', mod.id);
            moduleDiv.setAttribute('data-state', mod.defaultState);

            const icon = document.createElement('i');
            icon.className = mod.icon;
            icon.style.color = '';

            const labelSpan = document.createElement('span');
            labelSpan.className = 'module-label';
            labelSpan.textContent = mod.label;

            moduleDiv.appendChild(icon);
            moduleDiv.appendChild(labelSpan);
            grid.appendChild(moduleDiv);
        });

        const brightnessModule = document.createElement('div');
        brightnessModule.className = 'cc-module cc-slider-module';
        brightnessModule.innerHTML = `
            <div class="module-label"><i class="fas fa-sun"></i> 显示器亮度</div>
            <div class="slider-container">
                <i class="fas fa-sun" style="font-size: 14px; opacity:0.7;"></i>
                <input type="range" min="0.3" max="1.0" step="0.01" value="0.9" class="cc-slider brightness-slider">
                <i class="fas fa-sun" style="font-size: 18px;"></i>
            </div>
        `;
        grid.appendChild(brightnessModule);

        const audioModule = document.createElement('div');
        audioModule.className = 'cc-module cc-row-module';
        audioModule.innerHTML = `
            <div class="module-label"><i class="fas fa-headphones"></i> 声音输出</div>
            <div class="cc-detail" id="audio-output">MacBook Pro 扬声器</div>
        `;
        grid.appendChild(audioModule);

        cc.appendChild(grid);

        const footer = document.createElement('div');
        footer.className = 'cc-footer';
        footer.innerHTML = `
            <button class="cc-quick-btn" id="cc-lock"><i class="fas fa-lock"></i> 锁定屏幕</button>
            <button class="cc-quick-btn" id="cc-sleep"><i class="fas fa-bed"></i> 睡眠</button>
        `;
        cc.appendChild(footer);

        function setModuleState(module, state) {
            if (state === 'on') {
                module.classList.add('active');
            } else {
                module.classList.remove('active');
            }
            module.setAttribute('data-state', state);
        }

        const wifiModule = document.querySelector('.icon-module[data-id="wifi"]');
        if (wifiModule) {
            wifiModule.addEventListener('click', (e) => {
                e.stopPropagation();
                const newState = wifiModule.getAttribute('data-state') === 'on' ? 'off' : 'on';
                setModuleState(wifiModule, newState);
            });
        }

        const focusModule = document.querySelector('.icon-module[data-id="focus"]');
        if (focusModule) {
            focusModule.addEventListener('click', (e) => {
                e.stopPropagation();
                const newState = focusModule.getAttribute('data-state') === 'on' ? 'off' : 'on';
                setModuleState(focusModule, newState);
            });
        }

        const darkModule = document.querySelector('.icon-module[data-id="darkmode"]');
        if (darkModule) {
            // 初始状态：以已保存偏好为准（不随系统 prefers-color-scheme，避免覆盖用户选择）
            const savedDark = window.MacOSPrefs && window.MacOSPrefs.darkMode === true;
            setModuleState(darkModule, savedDark ? 'on' : 'off');

            darkModule.addEventListener('click', (e) => {
                e.stopPropagation();
                const current = darkModule.getAttribute('data-state');
                const newState = current === 'on' ? 'off' : 'on';
                setModuleState(darkModule, newState);
                const enabled = newState === 'on';
                // 统一走偏好系统：写 localStorage，其他窗口通过 storage 事件自动同步
                if (window.setPref) {
                    window.setPref('darkMode', enabled);
                } else {
                    document.body.classList.toggle('dark-mode', enabled);
                }
            });
        }

        const brightnessSlider = brightnessModule.querySelector('.brightness-slider');
        const desktop = document.querySelector('.desktop');
        if (brightnessSlider && desktop) {
            const setBrightness = (val) => {
                desktop.style.filter = `brightness(${val})`;
                if (cc) cc.style.filter = `brightness(${Math.max(0.65, val)})`;
            };
            brightnessSlider.addEventListener('input', (e) => setBrightness(e.target.value));
            setBrightness(brightnessSlider.value);
        }

        const lockBtn = document.getElementById('cc-lock');
        if (lockBtn) {
            lockBtn.addEventListener('click', () => { closeCC(); window.lockScreen?.(); });
        }
        const sleepBtn = document.getElementById('cc-sleep');
        if (sleepBtn) {
            sleepBtn.addEventListener('click', () => { closeCC(); window.enterSleepMode?.(); });
        }

        // 锁定屏幕：真刷新网页
        window.lockScreen = () => window.location.reload();

        // 睡眠：全屏黑屏遮罩，点击唤醒
        function enterSleepMode() {
            let overlay = document.getElementById('sleep-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'sleep-overlay';
                overlay.innerHTML = '<div class="sleep-moon"><i class="fas fa-moon"></i></div>';
                overlay.addEventListener('click', () => overlay.classList.remove('active'));
                document.body.appendChild(overlay);
            }
            requestAnimationFrame(() => overlay.classList.add('active'));
        }
        window.enterSleepMode = enterSleepMode;

        function openCC() { cc.classList.add('active'); }
        function closeCC() { cc.classList.remove('active'); }

        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                cc.classList.contains('active') ? closeCC() : openCC();
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', closeCC);
        }

        // 点击面板内部不关闭
        cc.addEventListener('click', (e) => e.stopPropagation());

        // 点击其他区域关闭
        document.addEventListener('click', () => {
            if (cc.classList.contains('active')) closeCC();
        });

        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && cc.classList.contains('active')) closeCC();
        });

        window.updateCCDarkMode = function(enabled) {
            if (darkModule) {
                const newState = enabled ? 'on' : 'off';
                if (darkModule.getAttribute('data-state') !== newState) {
                    setModuleState(darkModule, newState);
                }
            }
        };
        // 设置 App 的"勿扰模式"开关联动控制中心的专注模块
        window.ControlCenter = {
            open: openCC,
            close: closeCC,
            isOpen: () => cc.classList.contains('active'),
            setFocus: (enabled) => {
                if (focusModule) {
                    const newState = enabled ? 'on' : 'off';
                    if (focusModule.getAttribute('data-state') !== newState) {
                        setModuleState(focusModule, newState);
                    }
                }
            }
        };
    }
})();