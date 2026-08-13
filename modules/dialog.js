
// 主窗口模块：覆盖原生 alert，提供 MacOSDialog API，并转发 iframe 的对话框请求。
(function() {
    'use strict';

    let zCounter = 98000;
    let seq = 0;

    function createDialog({ type, title, message, value, placeholder }) {
        const id = 'macos-dialog-' + (++seq);
        const overlay = document.createElement('div');
        overlay.className = 'macos-dialog-overlay';
        overlay.id = id;

        const isPrompt = type === 'prompt';
        const buttons = isPrompt
            ? '<button class="macos-dialog-btn cancel">取消</button><button class="macos-dialog-btn primary">确定</button>'
            : type === 'confirm'
                ? '<button class="macos-dialog-btn cancel">取消</button><button class="macos-dialog-btn primary">确定</button>'
                : '<button class="macos-dialog-btn primary">好</button>';

        overlay.innerHTML = `
            <div class="macos-dialog">
                <div class="macos-dialog-title">${title || (type === 'confirm' ? '确认' : type === 'prompt' ? '输入' : '提示')}</div>
                <div class="macos-dialog-body">
                    <div class="macos-dialog-message">${message || ''}</div>
                    ${isPrompt ? `<input type="text" class="macos-dialog-input" value="${(value || '').replace(/"/g, '&quot;')}" placeholder="${(placeholder || '').replace(/"/g, '&quot;')}" />` : ''}
                </div>
                <div class="macos-dialog-actions">${buttons}</div>
            </div>`;

        document.body.appendChild(overlay);

        const input = overlay.querySelector('.macos-dialog-input');
        const primary = overlay.querySelector('.primary');
        const cancel = overlay.querySelector('.cancel');
        const close = (result) => {
            overlay.classList.add('closing');
            setTimeout(() => overlay.remove(), 150);
            resolve(result);
        };

        let resolve;
        const promise = new Promise(r => { resolve = r; });

        // 结果归一化：alert -> undefined；confirm -> boolean；prompt -> string|null
        const normalize = (btn) => {
            if (type === 'alert') return undefined;
            if (type === 'confirm') return btn === 'primary';
            if (type === 'prompt') return btn === 'primary' ? (input ? input.value : '') : null;
            return undefined;
        };

        if (primary) primary.addEventListener('click', () => close(normalize('primary')));
        if (cancel) cancel.addEventListener('click', () => close(normalize('cancel')));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && type !== 'alert') close(normalize('cancel'));
        });
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') close(normalize('primary'));
                if (e.key === 'Escape') close(normalize('cancel'));
            });
            setTimeout(() => { input.focus(); input.select(); }, 30);
        } else {
            if (primary) setTimeout(() => primary.focus(), 30);
        }
        // Esc 关闭
        const escHandler = (e) => {
            if (e.key === 'Escape' && !input) {
                document.removeEventListener('keydown', escHandler);
                close(normalize('cancel'));
            }
        };
        if (!input) document.addEventListener('keydown', escHandler);

        return promise;
    }

    // 转义 HTML，防止消息内容破坏对话框结构
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/\n/g, '<br>');
    }

    const MacOSDialog = {
        alert(opts) {
            return createDialog({ type: 'alert', title: opts?.title, message: esc(opts?.message ?? opts) });
        },
        confirm(opts) {
            return createDialog({ type: 'confirm', title: opts?.title, message: esc(opts?.message) });
        },
        prompt(opts) {
            return createDialog({ type: 'prompt', title: opts?.title, message: esc(opts?.message), value: opts?.value, placeholder: opts?.placeholder });
        }
    };

    // 覆盖原生 alert（同步 API 无法异步，这里仅主窗口同页调用；confirm/prompt 请用 MacOSDialog）

    window.alert = (msg) => {
        MacOSDialog.alert({ message: msg });
    };

    window.MacOSDialog = MacOSDialog;

window.addEventListener('message', (e) => {
        const d = e.data;
        if (!d || d.type !== 'macosDialog') return;
        const { reqId, op, payload } = d;
        const reply = (result) => {
            if (e.source) e.source.postMessage({ type: 'macosDialogResult', reqId, result }, '*');
        };
        MacOSDialog[op](payload).then(reply);
    });

    window.MacOSDialogSeq = () => ++zCounter;
})();