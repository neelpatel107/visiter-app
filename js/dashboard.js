/**
 * Galaxy Residents Hub - Dashboard Controller
 * Handles real-time stats, AI insights, and building health telemetry.
 */

const dashboard = {
    async init() {
        auth.checkAuth();
        await window.db.init();
        this.applyNightOps();
        this.updateStats();
        this.loadRecent();
        
        // Refresh stats every 30 seconds for real-time feel
        setInterval(() => this.updateStats(), 30000);
    },

    async updateStats() {
        const all = await window.db.getAll('visitors');
        const active = all.filter(v => v.status === 'active');
        const today = all.filter(v => new Date(v.checkIn).toDateString() === new Date().toDateString());
        const bl = await window.db.getAll('blacklist');

        const elToday = document.getElementById('todayVisitors');
        const elActive = document.getElementById('activeVisitors');
        const elBl = document.getElementById('blacklistCount');

        if (elToday) elToday.innerText = today.length;
        if (elActive) elActive.innerText = active.length;
        if (elBl) elBl.innerText = bl.length;
        
        this.updateSmartInsights(all);
        this.loadHoloWall(active);
        this.updateHospitality(all);
    },

    loadHoloWall(active) {
        const wall = document.getElementById('holoWall');
        if (!wall) return;
        wall.innerHTML = active.map(v => `
          <div class="holo-card" title="${v.name}">
            <img src="${v.photo}" class="holo-img">
            <div style="position: absolute; bottom: 5px; left: 5px; right: 5px; font-size: 0.6rem; text-align: center; color: white; background: rgba(0,0,0,0.5); border-radius: 4px;">
              ${v.name.split(' ')[0]}
            </div>
          </div>
        `).join('') || '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No active visitors</p>';
    },

    updateHospitality(all) {
        const withRatings = all.filter(v => v.rating);
        if (withRatings.length === 0) return;
        
        const positive = withRatings.filter(v => v.rating === '😊').length;
        const score = Math.round((positive / withRatings.length) * 100);
        
        const valEl = document.getElementById('sentimentValue');
        const fillEl = document.getElementById('sentimentFill');

        if (valEl) valEl.innerText = `${score}%`;
        if (fillEl) fillEl.style.width = `${score}%`;

        // Mood-Sync UI Logic
        if (score > 80) {
            document.body.setAttribute('data-mood', 'happy');
        } else if (score > 50) {
            document.body.setAttribute('data-mood', 'stressed');
        } else {
            document.body.setAttribute('data-mood', 'alert');
        }
        this.updateBuildingHealth(score, all);
    },

    updateBuildingHealth(satisfaction, all) {
        const active = all.filter(v => v.status === 'active').length;
        const densityScore = Math.max(0, 100 - (active * 2)); // Penalty for high density
        const health = Math.round((satisfaction + densityScore) / 2);
        
        const el = document.getElementById('healthScore');
        if (el) {
            el.innerText = `${health}%`;
            el.style.color = health > 80 ? 'var(--success)' : (health > 50 ? 'var(--warning)' : 'var(--danger)');
        }
        this.updateTicker(active, health);
    },

    updateTicker(count, health) {
        const ticker = document.getElementById('liveTicker');
        if (!ticker) return;
        ticker.innerText = `SOCIETY HUB: Online | ${count} Active Personnel | Building Health: ${health}% | 🛡️ SECURITY STATUS: OPTIMAL | 💧 Water Level: Normal`;
    },

    updateDensity(activeCount) {
        const el = document.getElementById('densityVal');
        if (!el) return;
        const density = activeCount > 20 ? 'High' : (activeCount > 10 ? 'Moderate' : 'Low');
        el.innerText = density;
        
        // Visual density indicator
        const schematic = document.querySelector('.schematic-container');
        if (schematic) {
            schematic.style.opacity = activeCount > 15 ? '0.8' : '0.4';
        }
    },

    updateSmartInsights(all) {
        const active = all.filter(v => v.status === 'active').length;
        this.updateDensity(active);
        
        const hour = new Date().getHours();
        let prediction = "Stable Traffic Flow";
        let recommendation = "Ideal time for area maintenance.";

        if (hour >= 18 && hour <= 21) {
            prediction = "Evening Rush Detected";
            recommendation = "High volume of food deliveries expected. Keep B-Gate staffed.";
        } else if (hour >= 8 && hour <= 10) {
            prediction = "Morning Service Peak";
            recommendation = "Daily help / Maid staff entry surge. Monitor Block-D entrance.";
        } else if (hour >= 23 || hour <= 5) {
            prediction = "High Vigilance Mode";
            recommendation = "Late night entry protocol active. ID scan mandatory.";
        }

        const predEl = document.getElementById('aiPrediction');
        const recEl = document.getElementById('aiRecommendation');

        if (predEl) predEl.innerText = prediction;
        if (recEl) recEl.innerText = recommendation;
    },

    toggleNightOps() {
        document.body.classList.toggle('night-ops');
        const isNight = document.body.classList.contains('night-ops');
        localStorage.setItem('vNightOps', isNight);
        app.initLucide();
    },

    applyNightOps() {
        if (localStorage.getItem('vNightOps') === 'true') {
            document.body.classList.add('night-ops');
        }
    },

    switchGate(gate) {
        const ticker = document.getElementById('liveTicker');
        if (ticker) ticker.innerText = `SWITCHING HUB CONTROL... Connecting to Gate ${gate.toUpperCase()}`;
        setTimeout(() => {
            this.updateStats();
            if (ticker) ticker.innerText = `CONNECTED: Gate ${gate.toUpperCase()} | All perimeter sensors verified.`;
        }, 1500);
    },

    async loadRecent() {
        const all = await window.db.getAll('visitors');
        const sorted = all.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn)).slice(0, 5);
        const table = document.getElementById('recentTable');
        if (!table) return;

        table.innerHTML = sorted.map(v => `
          <tr class="animate-fade">
            <td data-label="Visitor" style="display: flex; align-items: center; gap: 0.75rem;">
              <img src="${v.photo}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
              <span style="font-weight: 600;">${v.name}</span>
            </td>
            <td data-label="Purpose">${v.purpose}</td>
            <td data-label="Time" style="color: var(--text-muted); font-size: 0.8rem;">${new Date(v.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td data-label="Status">
              <span class="badge ${v.status === 'active' ? 'badge-success' : 'badge-warning'}">
                ${v.status === 'active' ? '<div class="pulse-dot"></div>' : ''}
                ${v.status}
              </span>
            </td>
          </tr>
        `).join('') || '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No activity</td></tr>';
    }
};

window.dashboard = dashboard;
window.addEventListener('DOMContentLoaded', () => dashboard.init());
