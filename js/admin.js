/**
 * Galaxy Residents Hub - Admin & System Control
 * Manages system protocols, branding, and data integrity.
 */

const admin = {
    async init() {
        auth.checkAuth();
        await window.db.init();
        this.applyTheme();
        this.loadFaceWall();
        this.loadAuditLog();
        this.updateExecutiveAnalytics();
        this.applyProtocol();
        this.trackEvent('Admin Session Initialized');
        
        // Auto-refresh data wall every 10 seconds
        setInterval(() => {
            this.loadFaceWall();
            this.updateExecutiveAnalytics();
        }, 10000);
    },

    setProtocol(level) {
        localStorage.setItem('vProtocolLevel', level);
        this.applyProtocol();
        const channel = new BroadcastChannel('visitor_alert');
        channel.postMessage({ type: 'PROTOCOL_CHANGE', level });
        this.trackEvent(`System Protocol escalated to LEVEL ${level}`);
        if (level === 3) alert('LEVEL 3 ACTIVATED: Building-wide Lockdown initiated.');
    },

    applyProtocol() {
        const level = localStorage.getItem('vProtocolLevel') || 1;
        document.body.setAttribute('data-protocol', level);
        const icons = { 1: 'shield', 2: 'shield-alert', 3: 'shield-off' };
        const iconEl = document.getElementById('protocolIcon');
        if (iconEl) iconEl.setAttribute('data-lucide', icons[level]);
        app.initLucide();
    },

    async updateExecutiveAnalytics() {
        const visitors = await window.db.getAll('visitors');
        if (visitors.length === 0) return;

        // Staff Efficiency (based on sentiment)
        const withRatings = visitors.filter(v => v.rating);
        const positive = withRatings.filter(v => v.rating === '😊').length;
        const efficiency = withRatings.length ? Math.round((positive / withRatings.length) * 100) : 85;

        // Avg Response Time
        const approved = visitors.filter(v => v.approvedAt);
        let totalDiff = 0;
        approved.forEach(v => {
            totalDiff += (new Date(v.approvedAt) - new Date(v.checkIn));
        });
        const avgMs = approved.length ? totalDiff / approved.length : 3000;
        const avgMins = (avgMs / 60000).toFixed(1);
        const responseScore = Math.max(10, 100 - (avgMins * 10));

        const active = visitors.filter(v => v.status === 'active').length;
        const assets = visitors.filter(v => v.asset && v.status === 'active').length;

        const capEl = document.getElementById('globalActiveVal');
        const fillEl = document.getElementById('globalCapFill');
        const assetEl = document.getElementById('assetSummary');

        if (capEl) capEl.innerText = `${active} / 250`;
        if (fillEl) fillEl.style.width = `${(active / 250) * 100}%`;
        if (assetEl) {
            assetEl.innerHTML = `
                <p style="margin-bottom: 0.5rem;">Checked-in Assets: <b>${assets}</b></p>
                <p>High-Value Alerts: <b style="color: var(--success);">0</b></p>
            `;
        }

        const container = document.getElementById('execSummary');
        if (container) {
            container.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                        <span>Staff Efficiency</span>
                        <span>${efficiency}%</span>
                    </div>
                    <div class="summary-bar"><div class="summary-fill" style="width: ${efficiency}%;"></div></div>
                </div>
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                        <span>Host Response Time</span>
                        <span>${avgMins}m</span>
                    </div>
                    <div class="summary-bar"><div class="summary-fill" style="width: ${responseScore}%; background: ${avgMins > 5 ? 'var(--danger)' : 'var(--warning)'};"></div></div>
                </div>
            `;
        }
    },

    trackEvent(msg) {
        const logs = JSON.parse(localStorage.getItem('vAuditLogs') || '[]');
        logs.unshift({ time: new Date().toLocaleTimeString(), msg });
        localStorage.setItem('vAuditLogs', JSON.stringify(logs.slice(0, 50)));
        this.loadAuditLog();
    },

    loadAuditLog() {
        const logEl = document.getElementById('auditLog');
        if (!logEl) return;
        const logs = JSON.parse(localStorage.getItem('vAuditLogs') || '[]');
        logEl.innerHTML = logs.map(l => `
            <div style="margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.25rem;">
                <span style="color: var(--primary);">[${l.time}]</span> ${l.msg}
            </div>
        `).join('') || '<div style="color: var(--text-muted);">No events recorded</div>';
    },

    async secureShred() {
        if (confirm('DANGER: This will permanently shred all personal visitor data older than 24 hours. This action is irreversible.')) {
            const vault = document.getElementById('privacyVault');
            if (vault) {
                vault.style.opacity = '0.5';
                vault.style.pointerEvents = 'none';
            }
            this.trackEvent('Executing GDPR Secure Shredding Protocol...');
            setTimeout(async () => {
                const count = await window.db.purgeOldData(1);
                this.trackEvent(`GDPR SHREDDING SUCCESS: ${count} identities removed.`);
                if (vault) {
                    vault.style.opacity = '1';
                    vault.style.pointerEvents = 'auto';
                }
                alert('GDPR Shredding Complete. All aged records sanitized.');
                this.loadFaceWall();
            }, 2000);
        }
    },

    async loadFaceWall() {
        const wall = document.getElementById('faceWall');
        if (!wall) return;
        const visitors = await window.db.getAll('visitors');
        const actives = visitors.filter(v => v.status === 'active');
        wall.innerHTML = actives.length ? '' : '<p style="color: var(--text-muted); font-size: 0.8rem; text-align: center; width: 100%;">No active visitors</p>';
        
        actives.forEach(v => {
            const div = document.createElement('div');
            div.className = 'holo-card';
            div.style.width = '60px';
            div.style.height = '60px';
            div.style.borderRadius = '12px';
            div.style.overflow = 'hidden';
            div.style.border = '1px solid var(--border)';
            
            const checkIn = new Date(v.checkIn).getTime();
            if ((Date.now() - checkIn) > (4 * 60 * 60 * 1000)) {
                div.style.borderColor = 'var(--danger)';
                div.style.boxShadow = '0 0 10px var(--danger)';
                this.trackEvent(`OVERSTAY ALERT: ${v.name} exceeded 4h limit.`);
            }
            div.innerHTML = `<img src="${v.photo}" style="width:100%; height:100%; object-fit:cover;">`;
            wall.appendChild(div);
        });
    },

    toggleKiosk() {
        const isKiosk = document.body.classList.toggle('kiosk-mode');
        localStorage.setItem('vKioskMode', isKiosk);
        const btn = document.getElementById('kioskBtn');
        if (btn) btn.innerText = isKiosk ? 'Exit Kiosk' : 'Enable Kiosk';
        this.trackEvent(`Kiosk Mode ${isKiosk ? 'Enabled' : 'Disabled'}`);
        if (isKiosk) window.location.href = 'visitors.html';
    },

    async purge() {
        if (confirm('Delete records older than 30 days?')) {
            const purged = await window.db.purgeOldData(30);
            this.trackEvent(`Manual maintenance: ${purged} records purged.`);
            alert(`Maintenance Complete: ${purged} records purged.`);
            await this.loadFaceWall();
        }
    },

    async reset() {
        if (confirm('CRITICAL: Factory reset will wipe all logs. Proceed?')) {
            await window.db.factoryReset();
            this.trackEvent('FACTORY RESET PERFORMED');
            alert('System Reset Successful!');
            window.location.href = 'index.html';
        }
    },

    updateTheme() {
        const colorPicker = document.getElementById('themeColor');
        const blurPicker = document.getElementById('glassBlur');
        if (!colorPicker || !blurPicker) return;

        const color = colorPicker.value;
        const blur = blurPicker.value;
        document.documentElement.style.setProperty('--primary', color);
        document.documentElement.style.setProperty('--glass-blur', `blur(${blur}px)`);
        localStorage.setItem('vThemeColor', color);
        localStorage.setItem('vGlassBlur', blur);
        this.trackEvent(`Theme updated to ${color}`);
        app.applyTheme();
    },

    setPreset(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('vThemePreset', theme);
        this.trackEvent(`Theme preset changed to ${theme}`);
        const colors = { default: '#6366f1', cyber: '#00f2ff', nature: '#10b981', sunset: '#f43f5e' };
        if (colors[theme]) {
            const colorPicker = document.getElementById('themeColor');
            if (colorPicker) colorPicker.value = colors[theme];
            document.documentElement.style.setProperty('--primary', colors[theme]);
            localStorage.setItem('vThemeColor', colors[theme]);
        }
        app.applyTheme();
    },

    updateBranding() {
        const nameInput = document.getElementById('brandName');
        const logoInput = document.getElementById('brandLogo');
        if (!nameInput || !logoInput) return;

        const name = nameInput.value;
        const logo = logoInput.value;
        if (name) localStorage.setItem('vBrandName', name);
        if (logo) localStorage.setItem('vBrandLogo', logo);
        this.trackEvent(`Branding updated: ${name || 'Default'}`);
        app.applyBranding();
        alert('Branding Applied Globally!');
    },

    applyTheme() {
        app.applyTheme();
        const color = localStorage.getItem('vThemeColor') || '#6366f1';
        const blur = localStorage.getItem('vGlassBlur') || '12';
        const colorPicker = document.getElementById('themeColor');
        const blurPicker = document.getElementById('glassBlur');
        if (colorPicker) colorPicker.value = color;
        if (blurPicker) blurPicker.value = blur;
    }
};

window.admin = admin;
window.addEventListener('DOMContentLoaded', () => admin.init());
