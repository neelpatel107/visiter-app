/**
 * Shared App Controller
 */

const app = {
    init() {
        this.applyTheme();
        this.applyBranding();
        this.injectSidebar();
        this.setupLogout();
        this.initLucide();
        this.initLang();
    },

    applyBranding() {
        const name = localStorage.getItem('vBrandName');
        const logo = localStorage.getItem('vBrandLogo');
        if (name) {
            const titles = document.querySelectorAll('.page-title, h1, #brandDisplay, .logo');
            titles.forEach(t => {
                if(t.classList.contains('logo')) {
                    t.innerHTML = `<i data-lucide="shield-check"></i> ${name}`;
                } else {
                    t.innerText = name;
                }
            });
        }
        if (logo) {
            const logos = document.querySelectorAll('.logo-img, img[alt="logo"]');
            logos.forEach(l => l.src = logo);
        }
    },

    applyTheme() {
        const color = localStorage.getItem('vThemeColor') || '#6366f1';
        const blur = localStorage.getItem('vGlassBlur') || '12';
        const preset = localStorage.getItem('vThemePreset') || 'default';
        
        document.body.setAttribute('data-theme', preset);
        document.documentElement.style.setProperty('--primary', color);
        document.documentElement.style.setProperty('--glass-blur', `blur(${blur}px)`);
    },

    async exportToCSV() {
        const visitors = await window.db.getAll('visitors');
        if (!visitors.length) return alert('No data to export.');

        const headers = ['Name', 'Phone', 'ID Number', 'Purpose', 'Host', 'Status', 'Check-In', 'Check-Out'];
        const rows = visitors.map(v => [
            v.name, v.phone, v.idNumber, v.purpose, v.host, v.status, v.checkIn, v.checkOut || ''
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `VisiCheck_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    translations: {
        en: { dashboard: "Dashboard", visitors: "Visitors", history: "History", admin: "System Admin", login: "Sign In", newCheckIn: "New Entry" },
        hi: { dashboard: "डैशबोर्ड", visitors: "आगंतुक", history: "इतिहास", admin: "सिस्टम एडमिन", login: "लॉगिन", newCheckIn: "नई एंट्री" },
        es: { dashboard: "Panel", visitors: "Visitantes", history: "Historial", admin: "Admin", login: "Entrar", newCheckIn: "Nueva entrada" },
        ar: { dashboard: "لوحة القيادة", visitors: "الزوار", history: "السجل", admin: "المسؤول", login: "دخول", newCheckIn: "دخول جديد" }
    },

    initLang() {
        const lang = localStorage.getItem('vLanguage') || 'en';
        this.setLang(lang);
        this.injectLangSwitcher();
    },

    setLang(code) {
        localStorage.setItem('vLanguage', code);
        document.documentElement.lang = code;
        document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
        // Simple translation for nav items
        const dict = this.translations[code] || this.translations.en;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.innerText = dict[key];
        });
        this.injectSidebar(); // Refresh sidebar with new lang
        this.initLucide(); // Re-initialize icons
    },

    injectLangSwitcher() {
        if (document.querySelector('.lang-switcher')) return;
        const div = document.createElement('div');
        div.className = 'lang-switcher';
        div.innerHTML = `
            <button class="lang-btn" onclick="app.setLang('en')">EN</button>
            <button class="lang-btn" onclick="app.setLang('hi')">HI</button>
            <button class="lang-btn" onclick="app.setLang('es')">ES</button>
            <button class="lang-btn" onclick="app.setLang('ar')">AR</button>
        `;
        document.body.appendChild(div);
    },

    injectSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        // Ensure overlay exists
        if (!document.getElementById('sidebarOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'sidebarOverlay';
            overlay.className = 'sidebar-overlay';
            overlay.onclick = () => this.toggleSidebar();
            document.body.appendChild(overlay);
        }

        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        const code = localStorage.getItem('vLanguage') || 'en';
        const dict = this.translations[code];

        sidebar.innerHTML = `
            <a href="index.html" class="logo">
                <i data-lucide="home"></i>
                Galaxy Residents
            </a>
            <ul class="nav-links">
                <li><a href="index.html" class="nav-link ${page === 'index.html' ? 'active' : ''}">
                    <i data-lucide="layout-dashboard"></i> ${dict.dashboard}
                </a></li>
                <li><a href="visitors.html" class="nav-link ${page === 'visitors.html' ? 'active' : ''}">
                    <i data-lucide="users"></i> ${dict.visitors}
                </a></li>
                <li class="mobile-only"><a href="visitors.html?reg=true" class="nav-link">
                    <i data-lucide="plus-circle"></i> ${dict.newCheckIn}
                </a></li>
                <li><a href="history.html" class="nav-link ${page === 'history.html' ? 'active' : ''}">
                    <i data-lucide="history"></i> ${dict.history}
                </a></li>
                <li><a href="admin.html" class="nav-link ${page === 'admin.html' ? 'active' : ''}">
                    <i data-lucide="settings"></i> ${dict.admin}
                </a></li>
            </ul>
        `;
    },

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar && overlay) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    },

    setupLogout() {
        const btn = document.getElementById('logoutBtn');
        if (btn) btn.onclick = () => window.auth.logout();

        const user = window.auth.checkAuth();
        if (user) {
            const nameEl = document.getElementById('userName');
            if (nameEl) nameEl.innerText = user.name;
        }
    },

    initLucide() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    },

    triggerSOS() {
        const el = document.getElementById('globalSOS');
        if (el) {
            el.style.display = 'flex';
            const synth = window.speechSynthesis;
            const msg = new SpeechSynthesisUtterance("Emergency Alert! Please proceed to the nearest exit immediately.");
            msg.loop = true;
            synth.speak(msg);
        }
        // Broadcast to other tabs
        const channel = new BroadcastChannel('visitor_alert');
        channel.postMessage('SOS_START');
    },

    stopSOS() {
        const el = document.getElementById('globalSOS');
        if (el) el.style.display = 'none';
        window.speechSynthesis.cancel();
        
        const channel = new BroadcastChannel('visitor_alert');
        channel.postMessage('SOS_STOP');
    },

    initSync() {
        const channel = new BroadcastChannel('visitor_alert');
        channel.onmessage = (e) => {
            if (e.data === 'SOS_START') this.triggerSOS();
            if (e.data === 'SOS_STOP') this.stopSOS();
            if (e.data === 'SILENT_WATCHLIST_ALERT') {
                console.warn('⚠️ SILENT SECURITY ALERT: High-interest individual detected at another gate.');
            }
        };

        // Stealth Panic Shortcut
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.triggerSOS();
                alert('STEALTH PANIC ACTIVATED - EMERGENCY BROADCAST SENT');
            }
        });
    },

    toggleA11y() {
        document.body.classList.toggle('a11y-mode');
        const isA11y = document.body.classList.contains('a11y-mode');
        localStorage.setItem('vA11y', isA11y);
    },

    applyA11y() {
        if (localStorage.getItem('vA11y') === 'true') {
            document.body.classList.add('a11y-mode');
        }
    },

    toggleSearch() {
        const hud = document.getElementById('searchHUD');
        if (!hud) return;
        hud.classList.toggle('active');
        if (hud.classList.contains('active')) {
            document.getElementById('globalSearchInput').focus();
        }
    },

    async performSearch(q) {
        if (!q) return document.getElementById('searchHits').innerHTML = '';
        const visitors = await window.db.getAll('visitors');
        const hits = visitors.filter(v => v.name.toLowerCase().includes(q.toLowerCase()) || v.idNumber.includes(q));
        
        document.getElementById('searchHits').innerHTML = hits.map(h => `
            <div style="padding: 1rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 1rem; cursor: pointer;" onclick="window.location.href='history.html?id=${h.id}'">
                <img src="${h.photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <div>
                    <p style="font-weight: 700; font-size: 0.9rem;">${h.name}</p>
                    <p style="font-size: 0.7rem; color: var(--text-muted);">${h.idNumber} | Last: ${new Date(h.checkIn).toLocaleDateString()}</p>
                </div>
            </div>
        `).join('') || '<p style="padding: 1rem; color: var(--text-muted);">No matching records found.</p>';
    },

    initShortcuts() {
        window.addEventListener('keydown', (e) => {
            // Search Control + K
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.toggleSearch();
            }
            // Escape to close
            if (e.key === 'Escape') {
                document.getElementById('searchHUD')?.classList.remove('active');
            }
        });
    },

    showModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    },

    hideModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    }
};

window.app = app;
window.addEventListener('DOMContentLoaded', () => {
    app.init();
    app.initSync();
    app.applyA11y();
    app.initShortcuts();
});
