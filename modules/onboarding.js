

(function () {
    'use strict';

    const ACCOUNT_KEY = 'macos_account';
    const AVATAR_COLORS = ['#007aff', '#ff3b30', '#30d158', '#ff9500', '#af52de', '#ff2d55'];

    function getAccount() {
        try {
            const raw = localStorage.getItem(ACCOUNT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function saveAccount(account) {
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    }

    function clearAccount() {
        localStorage.removeItem(ACCOUNT_KEY);
    }

    function createOverlay(html) {
        const overlay = document.createElement('div');
        overlay.className = 'auth-overlay';
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
        return overlay;
    }

    function removeOverlay(overlay) {
        overlay.classList.add('auth-hide');
        setTimeout(() => overlay.remove(), 480);
    }

function runOnboarding() {
        return new Promise((resolve) => {
            const dots = AVATAR_COLORS.map((c) =>
                `<button type="button" class="avatar-dot" data-color="${c}" style="background:${c}"></button>`
            ).join('');

            const overlay = createOverlay(`
                <div class="auth-card">
                    <div class="auth-logo"><i class="fab fa-apple"></i></div>
                    <h1 class="auth-title">欢迎使用 macOS</h1>
                    <p class="auth-sub">创建您的账户以开始使用</p>
                    <div class="auth-avatar-picker">${dots}</div>
                    <div class="auth-field">
                        <input id="auth-username" type="text" placeholder="用户名" autocomplete="off" maxlength="20" />
                    </div>
                    <div class="auth-field">
                        <input id="auth-password" type="password" placeholder="密码（至少 4 位）" autocomplete="off" />
                    </div>
                    <div class="auth-field">
                        <input id="auth-confirm" type="password" placeholder="确认密码" autocomplete="off" />
                    </div>
                    <div class="auth-error" id="auth-error"></div>
                    <button class="auth-btn" id="auth-submit">创建账户</button>
                </div>
            `);

            let pickedColor = AVATAR_COLORS[0];
            const dotEls = overlay.querySelectorAll('.avatar-dot');
            dotEls.forEach((dot) => {
                dot.addEventListener('click', () => {
                    dotEls.forEach((d) => d.classList.remove('selected'));
                    dot.classList.add('selected');
                    pickedColor = dot.dataset.color;
                });
            });
            dotEls[0].classList.add('selected');

            const submit = () => {
                const username = overlay.querySelector('#auth-username').value.trim();
                const pwd = overlay.querySelector('#auth-password').value;
                const confirm = overlay.querySelector('#auth-confirm').value;
                const err = overlay.querySelector('#auth-error');
                if (!username) { err.textContent = '请输入用户名'; return; }
                if (pwd.length < 4) { err.textContent = '密码至少需要 4 位'; return; }
                if (pwd !== confirm) { err.textContent = '两次输入的密码不一致'; return; }
                const account = {
                    username: username,
                    password: pwd,
                    avatarColor: pickedColor,
                    createdAt: Date.now()
                };
                saveAccount(account);
                removeOverlay(overlay);
                resolve(account);
            };

            overlay.querySelector('#auth-submit').addEventListener('click', submit);
            overlay.querySelectorAll('input').forEach((inp) => {
                inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
            });
            setTimeout(() => overlay.querySelector('#auth-username').focus(), 120);
        });
    }

function runLogin(account) {
        return new Promise((resolve) => {
            const initial = (account.username || '?').charAt(0).toUpperCase();
            const overlay = createOverlay(`
                <div class="auth-card">
                    <div class="auth-avatar" style="background:${account.avatarColor}">${initial}</div>
                    <h1 class="auth-title">${account.username}</h1>
                    <p class="auth-sub">点击登录以继续使用</p>
                    <button class="auth-btn" id="login-submit">登录</button>
                </div>
            `);

            const submit = () => {
                removeOverlay(overlay);
                resolve(account);
            };

            overlay.querySelector('#login-submit').addEventListener('click', submit);
            setTimeout(() => overlay.querySelector('#login-submit').focus(), 120);
        });
    }

    window.Onboarding = { getAccount, runOnboarding, runLogin, clearAccount };
})();
