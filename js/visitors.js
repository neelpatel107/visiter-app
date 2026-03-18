/**
 * VisiCheck Enterprise - Visitor Management Logic
 * Moving logic to external file for professional architecture.
 */

const visitors = {
    view: 'active',
    stream: null,
    faceShieldOn: false,

    async init() {
        auth.checkAuth();
        await window.db.init();
        await this.seedData();
        this.loadActive();
        this.loadEmployees();
        this.setupEvents();
        this.initSig();
        this.checkCapacity();
        if (window.location.hash === '#kiosk') this.enableKiosk();
        if (window.location.hash === '#evac') {
            setTimeout(() => this.exportEvacList(), 1000);
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('reg') === 'true') {
            this.toggleView();
        }
    },

    async seedData() {
        const visitors = await window.db.getAll('visitors');
        if (visitors.length > 0) return;

        // Populate initial data for impressive analytics on first load
        const hosts = ["Sarah IT", "Mike HR", "Elena Sales", "David Ops"];
        const purposes = ["Meeting", "Maintenance", "Personal", "Delivery"];
        const samples = [];

        for (let i = 0; i < 25; i++) {
            const checkIn = new Date(Date.now() - Math.random() * 86400000 * 5); // Within last 5 days
            const approvedAt = new Date(checkIn.getTime() + (Math.random() * 5 * 60000)); // 0-5 mins approved
            const isRegular = i % 8 === 0;
            samples.push({
                name: `Guest ${i + 1}`,
                phone: `92300${Math.floor(Math.random() * 9000000)}`,
                idNumber: `ID-${1000 + i}`,
                purpose: purposes[i % 4],
                host: hosts[i % 4],
                room: `Wing-${i % 3 + 1}`,
                photo: 'static/profile-placeholder.png', // Fallback
                status: 'checked-out',
                checkIn: checkIn.toISOString(),
                approvedAt: approvedAt.toISOString(),
                checkOut: new Date(checkIn.getTime() + 7200000).toISOString(),
                isRegular,
                isVip: i % 10 === 0,
                sentiment: 5
            });
        }
        for (const s of samples) await window.db.add('visitors', s);
        console.log("💎 VisiCheck: Diamond Tier Seed Data Initialized.");
    },

    async checkCapacity() {
        if (!document.getElementById('capacityBadge')) return;
        const all = await window.db.getAll('visitors');
        const active = all.filter(v => v.status === 'active').length;
        const badge = document.getElementById('capacityBadge');
        if (active >= 50) {
            badge.className = 'badge badge-danger';
            badge.innerText = 'Capacity: FULL';
            document.getElementById('regForm').style.opacity = '0.5';
            document.getElementById('regForm').style.pointerEvents = 'none';
            alert('Building at maximum capacity. Please wait for checkout.');
        } else {
            badge.className = 'badge badge-success';
            badge.innerText = 'Capacity: OK';
        }
    },

    translate(lang) {
        const dict = {
            en: { title: 'Visitor Management', concierge: 'Digital Concierge Active', speak: 'Speak Now' },
            es: { title: 'Gestión de Visitantes', concierge: 'Conserje Digital Activo', speak: 'Habla Ahora' },
            fr: { title: 'Gestion des Visiteurs', concierge: 'Concierge Numérique Actif', speak: 'Parlez Maintenant' }
        };
        const t = dict[lang];
        document.getElementById('pageTitle').innerText = t.title;
        document.getElementById('conciergeLabel').innerText = t.concierge;
    },

    togglePackageMode() {
        const btn = document.getElementById('packageBtn');
        btn.style.borderColor = btn.style.borderColor === 'var(--primary)' ? 'var(--border)' : 'var(--primary)';
        this.packageMode = !this.packageMode;
        if(this.packageMode) {
            document.getElementById('vPurpose').value = 'Delivery / Package Intake';
            alert('Express Package Mode Enabled');
        }
    },

    verifyOTP() {
        const phone = document.getElementById('vPhone').value;
        if (!phone) {
            alert('Please enter a phone number first!');
            return;
        }
        const btn = window.event.target;
        const oldText = btn.innerText;
        btn.innerText = 'SENDING...';
        btn.disabled = true;
        
        setTimeout(() => {
            const code = prompt('Enter the 4-digit code sent to your phone (Demo Hint: 1234):');
            if (code === '1234') {
                alert('✅ Phone Verified Successfully!');
                btn.innerText = 'VERIFIED';
                btn.style.background = 'var(--success)';
                this.phoneVerified = true;
            } else {
                alert('❌ Invalid Code. Use 1234 for demo.');
                btn.innerText = oldText;
                btn.disabled = false;
            }
        }, 1500);
    },

    startOCR() {
        alert('📷 Initializing AI OCR Scanner... Please present ID card to camera.');
        const btn = window.event.currentTarget;
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> SCANNING...';
        app.initLucide();
        
        setTimeout(() => {
            document.getElementById('vName').value = "Adnan Ahmed";
            document.getElementById('vId').value = "42201-8877665-3";
            alert('✅ ID Card Scanned: Adnan Ahmed (CNIC: 42201-8877665-3)');
            btn.innerHTML = '<i data-lucide="check-circle"></i> SCANNED';
            app.initLucide();
            this.idScanned = true;
        }, 2000);
    },

    notifyResident() {
        const host = document.getElementById('vHost').value;
        if (!host) {
            alert('Please enter the Resident Name first!');
            return;
        }
        const statusEl = document.getElementById('approvalStatus');
        const btn = window.event.currentTarget;
        
        btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> NOTIFYING...';
        statusEl.innerHTML = 'STATUS: <span style="color: var(--warning);">PULSING RESIDENT APP...</span>';
        app.initLucide();

        setTimeout(() => {
            statusEl.innerHTML = 'STATUS: <span style="color: var(--success);">APPROVED BY RESIDENT ✅</span>';
            btn.innerHTML = '<i data-lucide="check"></i> NOTIFIED';
            btn.style.background = 'var(--success)';
            alert(`✅ Resident ${host} has approved the entry via VisiCheck App!`);
            this.residentApproved = true;
        }, 3000);
    },

    initSig() {
        const canvas = document.getElementById('sigPad');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let drawing = false;

        const startDrawing = () => drawing = true;
        const stopDrawing = () => { drawing = false; ctx.beginPath(); };
        const draw = (e) => {
            if (!drawing) return;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#6366f1';
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX || e.touches[0].clientX) - rect.left;
            const y = (e.clientY || e.touches[0].clientY) - rect.top;
            ctx.lineTo(x, y);
            ctx.stroke();
        };

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(); });
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); });
    },

    clearSig() {
        const c = document.getElementById('sigPad');
        if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
    },

    async checkIdentity(idNum) {
        const history = await window.db.getAll('visitors');
        const lastVisit = history.reverse().find(v => v.idNumber === idNum);
        if (lastVisit) {
            document.getElementById('vName').value = lastVisit.name;
            document.getElementById('vPurpose').value = lastVisit.purpose;
            this.handlePurposeChange();
            document.getElementById('vName').style.borderColor = 'var(--success)';
        }
        
        // Blacklist check
        const bl = await window.db.findBy('blacklist', 'idNumber', idNum);
        if (bl) {
            const input = document.getElementById('vId');
            input.style.borderColor = 'var(--danger)';
            input.style.color = 'var(--danger)';
            if (navigator.vibrate) navigator.vibrate(200);
        }
    },

    startVoice() {
        const synth = window.speechSynthesis;
        const msg = new SpeechSynthesisUtterance("Welcome! Please tell me your name.");
        synth.speak(msg);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                document.getElementById('vName').value = transcript;
            };
            rec.start();
        } else {
            alert('Voice recognition not supported in this browser.');
        }
    },

    setupEvents() {
        const form = document.getElementById('regForm');
        if (form) form.onsubmit = (e) => this.handleReg(e);
        
        // Removed camera events as we moved to upload system
    },

    async loadEmployees() {
        const staff = await window.db.getAll('employees');
        const el = document.getElementById('vHost');
        if (el) el.innerHTML = staff.map(s => `<option value="${s.name} ${s.dept}">${s.name} (${s.dept})</option>`).join('');
    },

    async loadActive() {
        const all = await window.db.getAll('visitors');
        const active = all.filter(v => v.status === 'active');
        const list = document.getElementById('activeList');
        if (!list) return;

        list.innerHTML = active.map(v => {
            const vCount = all.filter(x => x.idNumber === v.idNumber).length;
            const tier = this.getLoyaltyTier(vCount);
            return `
                <div class="card ${v.isVip ? 'vip-card' : ''}" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <img src="${v.photo}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid ${v.isVip ? '#fbbf24' : 'var(--border)'}">
                        <div style="flex:1;">
                            <h4 style="font-weight: 700;">${v.name} ${v.isVip ? '⭐' : ''}</h4>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                <p style="font-size: 0.8125rem; color: var(--text-muted);">${v.idNumber}</p>
                                ${tier ? `<span class="loyalty-badge ${tier.class}">${tier.label}</span>` : ''}
                            </div>
                        </div>
                        <span class="badge badge-success"><div class="pulse-dot"></div> Active</span>
                    </div>
                    <div style="padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 12px; font-size: 0.8125rem;">
                        <p style="margin-bottom: 0.25rem;"><b>Flat / Unit:</b> ${v.room || 'General'}</p>
                        <p style="margin-bottom: 0.25rem;"><b>Visiting:</b> ${v.host}</p>
                        ${v.asset ? `<p><b>Vehicle/ID:</b> <span class="asset-tag">${v.asset}</span></p>` : ''}
                    </div>
                    <button onclick="visitors.checkOut(${v.id})" class="primary-btn btn-danger" style="width: 100%;">
                        <i data-lucide="log-out"></i> Check Out
                    </button>
                </div>
            `;
        }).join('') || '<p style="text-align:center; grid-column: 1/-1;">No active visitors.</p>';
        app.initLucide();
    },

    toggleView() {
        this.view = this.view === 'active' ? 'reg' : 'active';
        document.getElementById('activeView').classList.toggle('hidden', this.view !== 'active');
        document.getElementById('regView').classList.toggle('hidden', this.view !== 'reg');
        document.getElementById('viewToggleBtn').innerHTML = this.view === 'active' ? '<i data-lucide="plus"></i> New Check-In' : '<i data-lucide="list"></i> Active List';
        const fab = document.getElementById('mobileFab');
        if (fab) fab.innerHTML = this.view === 'active' ? '<i data-lucide="plus"></i>' : '<i data-lucide="list"></i>';
        
        document.getElementById('pageTitle').innerText = this.view === 'active' ? 'Visitor Management' : 'Visitor Registration';
        app.initLucide();
        if (this.view === 'reg') {
            const c = document.getElementById('sigPad');
            c.width = c.offsetWidth;
            c.height = c.offsetHeight;
        }
    },

    handlePurposeChange() {
        const p = document.getElementById('vPurpose').value;
        const hb = document.getElementById('hostBox');
        const cb = document.getElementById('companyBox');
        if (hb) hb.classList.toggle('hidden', p === 'Delivery' || p === 'Maintenance');
        if (cb) cb.classList.toggle('hidden', p !== 'Delivery' && p !== 'Maintenance');
    },

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const i = document.getElementById('capturedImg');
            const placeholder = document.getElementById('uploadPlaceholder');
            const overlay = document.getElementById('scanOverlay');
            
            i.src = e.target.result;
            i.classList.remove('hidden');
            placeholder.classList.add('hidden');
            overlay.classList.remove('hidden');
            
            // Trigger visual "scan" effect
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 2000);

            if (document.getElementById('faceShieldToggle').checked) {
                i.classList.add('face-shield-active');
                this.faceShieldOn = true;
            } else {
                i.classList.remove('face-shield-active');
                this.faceShieldOn = false;
            }

            // AI Mood Detection Simulation
            const moods = ["Professional", "Calm", "Rushed", "Stressed", "Happy"];
            this.currentMood = moods[Math.floor(Math.random() * moods.length)];
            console.log(`AI MOOD DETECTED: ${this.currentMood}`);
        };
        reader.readAsDataURL(file);
    },

    // Old Camera functions removed in favor of handleImageUpload
    startCamera() {},
    takePhoto() {},

    async handleReg(e) {
        e.preventDefault();
        const idNum = document.getElementById('vId').value;
        const blUser = await window.db.findBy('blacklist', 'idNumber', idNum);

        if (blUser) {
            document.getElementById('blReason').innerText = blUser.reason;
            app.showModal('securityModal');
            return;
        }

        const sigPad = document.getElementById('sigPad');
        const signature = sigPad.toDataURL();
        const all = await window.db.getAll('visitors');
        const visits = all.filter(v => v.idNumber === idNum).length;
        
        const isWatched = ["42201-1122334-9", "35202-9988776-3"].includes(idNum);
        if (isWatched) new BroadcastChannel('visitor_alert').postMessage('SILENT_WATCHLIST_ALERT');


        const data = {
            name: document.getElementById('vName').value,
            phone: document.getElementById('vPhone').value,
            idNumber: idNum,
            isVip: idNum.toUpperCase().includes('VIP'),
            isRegular: visits >= 5,
            host: document.getElementById('vHost').value || 'Security Gate',
            room: document.getElementById('vUnit').value,
            block: document.getElementById('vUnit').value?.split('-')[0] || 'Unknown',
            isWatched: isWatched,
            photo: document.getElementById('capturedImg').src,
            faceShield: this.faceShieldOn,
            guests: document.getElementById('vGuests').value,
            visitType: document.getElementById('vType').value,
            plate: document.getElementById('vPlate').value,
            company: document.getElementById('vCompany').value,
            status: 'active',
            checkIn: new Date().toISOString(),
            isAnomaly: this.runAnomalyCheck(document.getElementById('vName').value, idNum)
        };

        const rid = await window.db.add('visitors', data);
        
        if (data.isRegular) {
            const lAlert = document.createElement('div');
            lAlert.style.cssText = 'position:fixed; top:80px; left:50%; transform:translateX(-50%); background:var(--success); color:white; padding:0.5rem 1.5rem; border-radius:30px; z-index:10001; font-weight:700;';
            lAlert.innerHTML = '🛡️ VERIFIED GUEST: Regular Visitor Detected';
            document.body.appendChild(lAlert);
            setTimeout(() => lAlert.remove(), 3000);
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:10000; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(10px);';
        const trivia = ["Runs 100% on Solar", "500+ Office Plants", "CEO started in a Cafe"];
        const fact = trivia[Math.floor(Math.random() * trivia.length)];

        overlay.innerHTML = `
            <div class="pulse-dot" style="width:40px; height:40px; background:var(--primary);"></div>
            <h3 style="margin-top:2rem; color:white;">Notifying ${data.host}...</h3>
            <p style="color:var(--text-muted); margin-top:1rem;">Waiting for host approval</p>
            <div style="margin-top:3rem; padding: 1.5rem; background: rgba(255,255,255,0.05); border-radius:12px; max-width:300px; text-align:center;">
                <p style="font-size:0.85rem; color:rgba(255,255,255,0.8); font-style:italic;">"Did you know? ${fact}"</p>
            </div>
        `;
        document.body.appendChild(overlay);

        setTimeout(async () => {
            overlay.innerHTML = `<h3 style="color:white;">Visit Approved!</h3>`;
            setTimeout(async () => {
                overlay.remove();
                data.approvedAt = new Date().toISOString();
                await window.db.update('visitors', { ...data, id: rid, approvedAt: data.approvedAt });
                this.showPass(data, rid);
                this.loadActive();
                this.toggleView();
                e.target.reset();
                this.clearSig();
            }, 1000);
        }, 2000);
        this.sendNotification(data);
    },

    async checkOut(id) {
        this.activeCheckOutId = id;
        app.showModal('sentimentModal');
    },

    async submitSentiment(rating) {
        const id = this.activeCheckOutId;
        const v = await window.db.getById('visitors', id);
        v.status = 'checked-out';
        v.checkOut = new Date().toISOString();
        v.rating = rating;
        v.note = document.getElementById('vNote').value;
        await window.db.update('visitors', v);
        app.hideModal('sentimentModal');
        document.getElementById('vNote').value = '';
        this.loadActive();
    },

    showPass(v, rid) {
        const eta = new Date(Date.now() + 45*60000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const pr = document.getElementById('passRid');
        if (pr) pr.innerText = rid;

        const pattern = this.generateSecurityPattern(rid);
        const passModal = document.querySelector('.holo-pass-3d');
        if (passModal) passModal.style.backgroundImage = `url(${pattern}), linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))`;

        const bayNum = v.plate ? `BAY-${Math.floor(Math.random() * 50) + 100}` : 'NO_PARKING';

        document.getElementById('passDetails').innerHTML = `
            <h3 style="margin-bottom: 0.5rem; color: var(--primary);">${v.name}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                <div><p style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">Location</p><p style="font-size: 0.85rem; font-weight: 700; color: white;">${v.room}</p></div>
                <div><p style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">Est. Checkout</p><p style="font-size: 0.85rem; font-weight: 700; color: var(--warning);">${eta}</p></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                 <div class="parking-bay-badge">
                    <p style="font-size: 0.5rem; color: var(--primary);">PARKING BAY</p>
                    <p style="font-size: 0.8rem; letter-spacing: 1px;">${bayNum}</p>
                </div>
                <div class="wifi-voucher" style="background: rgba(255,255,255,0.05); margin-top: 0;"><div><p style="font-size: 0.5rem; color: var(--text-muted); text-transform: uppercase;">Guest Wifi</p><p class="wifi-code" style="font-size: 0.6rem;">VISIT-FREE</p></div><i data-lucide="wifi" style="color: var(--primary); width: 14px;"></i></div>
            </div>
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.75rem; color: var(--text-muted);">Host: <b style="color: white;">${v.host.split(' ')[0]}</b></div>
        `;

        const pathLine = document.getElementById('pathLine');
        if (pathLine) pathLine.style.transform = `rotate(${(v.host.length * 10) % 360}deg)`;

        new QRious({ element: document.getElementById('qr'), value: `VIS-${rid}`, size: 160 });
        app.showModal('passModal');
    },

    async downloadPDF() {
        const { jsPDF } = window.jspdf;
        const modal = document.querySelector('#passModal .modal');
        const canvas = await html2canvas(modal, { scale: 2, backgroundColor: '#0f172a' });
        const pdf = new jsPDF('p', 'mm', 'a6');
        const pWidth = pdf.internal.pageSize.getWidth();
        const pHeight = (canvas.height * pWidth) / canvas.width;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pWidth, pHeight);
        pdf.save(`VisiCheck_Pass_${Date.now()}.pdf`);
    },

    async exportEvacList() {
        const all = await window.db.getAll('visitors');
        const active = all.filter(v => v.status === 'active');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(22); doc.setTextColor(255, 0, 0);
        doc.text("EMERGENCY EVACUATION ROLL CALL", 105, 20, { align: 'center' });
        doc.setFontSize(10); doc.setTextColor(0, 0, 0);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
        let y = 50;
        doc.text("Visitor Name", 20, y); doc.text("ID Number", 80, y); doc.text("Room", 140, y);
        active.forEach(v => { y += 10; doc.text(String(v.name).substring(0, 25), 20, y); doc.text(String(v.idNumber), 80, y); doc.text(String(v.room), 140, y); });
        doc.save("EVACUATION_LIST.pdf");
    },

    sendNotification(v) {
        if (window.Notification && Notification.permission === 'granted') {
            new Notification('Visitor Check-In', { body: `${v.name} has arrived.` });
        }
    },

    async updateStats() {
        const visitors = await window.db.getAll('visitors');
        const active = visitors.filter(v => v.status === 'active').length;
        document.getElementById('activeCount').innerText = active;
    },

    toggleChat() {
        const d = document.getElementById('conciergeDrawer');
        if (d) d.classList.toggle('active');
    },

    sendSystemChat(msg) {
        document.getElementById('chatInput').value = msg;
        this.sendChatMessage();
    },

    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const box = document.getElementById('chatBox');
        if (!input.value) return;

        const uMsg = document.createElement('div');
        uMsg.className = 'chat-bubble chat-user';
        uMsg.innerText = input.value;
        box.appendChild(uMsg);

        const q = input.value.toLowerCase();
        input.value = '';
        
        setTimeout(() => {
            const bMsg = document.createElement('div');
            bMsg.className = 'chat-bubble chat-bot';
            
            if (q.includes('block')) bMsg.innerText = "Block A and B are straight ahead. Block C and D are to the left of the central garden. Block E and F are near the east gate.";
            else if (q.includes('plumber') || q.includes('maintenance')) bMsg.innerText = "The society maintenance office is located in the basement of Block B. You can also call them at ext 1002.";
            else if (q.includes('parking')) bMsg.innerText = "Visitors must park in the yellow-marked bays. Resident parking is strictly restricted to assigned slots.";
            else if (q.includes('rules')) bMsg.innerText = "1. No loud music after 10 PM. 2. Speed limit 10km/h. 3. Garbage must be segregated. 4. Guests must register at gate.";
            else if (q.includes('sos') || q.includes('emergency')) bMsg.innerText = "🚨 Emergency Contacts: Security (101), Management (102), Fire (101), Ambulance (108).";
            else if (q.includes('manager')) bMsg.innerText = "The Society Manager, Mr. Kapoor, is available in the club house from 10 AM to 6 PM.";
            else bMsg.innerText = "I'm checking the society bylaws and resident directory... For immediate help, please contact the main security gate at ext 001.";
            
            box.appendChild(bMsg);
            box.scrollTop = box.scrollHeight;
        }, 1000);
    },

    async simulateQuickScan() {
        const overlay = document.getElementById('scanOverlay');
        overlay.classList.remove('hidden');
        
        // Simulate "Processing" time
        setTimeout(async () => {
            const all = await window.db.getAll('visitors');
            // Find a regular visitor to simulate "recognition"
            const regular = all.find(v => v.isRegular) || all[0];
            
            if (regular) {
                document.getElementById('vName').value = regular.name;
                document.getElementById('vId').value = regular.phone;
                document.getElementById('vPurpose').value = regular.purpose;
                document.getElementById('vHost').value = regular.host;
                document.getElementById('capturedImg').src = regular.photo;
                document.getElementById('capturedImg').classList.remove('hidden');
                document.getElementById('uploadPlaceholder').classList.add('hidden');
                
                const lAlert = document.createElement('div');
                lAlert.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:var(--primary); color:white; padding:1rem 2rem; border-radius:12px; z-index:20000; font-weight:700; border: 2px solid white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);';
                lAlert.innerHTML = `🧬 AI RECOGNITION: Verified Regular Visitor Found - ${regular.name}`;
                document.body.appendChild(lAlert);
                setTimeout(() => lAlert.remove(), 4000);
                
                this.handlePurposeChange();
            }
            overlay.classList.add('hidden');
        }, 2000);
    },

    getLoyaltyTier(visits) {
        if (visits >= 20) return { label: 'Gold', class: 'tier-gold' };
        if (visits >= 10) return { label: 'Silver', class: 'tier-silver' };
        if (visits >= 5) return { label: 'Bronze', class: 'tier-bronze' };
        return null;
    },

    runAnomalyCheck(name, id) {
        // AI Anomaly simulation logic for Residential Society
        const hour = new Date().getHours();
        const isLate = hour < 6 || hour > 23; // Suspicious after 11 PM or before 6 AM
        const isSuspiciousName = name.length < 3;
        const result = isLate || isSuspiciousName || Math.random() < 0.05;
        if (result) {
             const channel = new BroadcastChannel('visitor_alert');
             channel.postMessage({ type: 'ANOMALY_DETECTED', name });
        }
        return result;
    },

    startVoiceVerify() {
        const btn = document.getElementById('voiceRecBtn');
        const wave = document.getElementById('voiceWave');
        const status = document.getElementById('voiceStatus');
        
        btn.classList.add('hidden');
        wave.classList.remove('hidden');
        status.innerText = "Listening for consent...";
        
        setTimeout(() => {
            wave.classList.add('hidden');
            btn.classList.remove('hidden');
            btn.innerHTML = '✓ Voice Identity Captured';
            btn.style.borderColor = 'var(--success)';
            btn.style.color = 'var(--success)';
            status.innerText = "Voice print verified & encrypted.";
            this.voiceVerified = true;
            app.initLucide();
        }, 3000);
    },

    generateSecurityPattern(rid) {
        const canvas = document.createElement('canvas');
        canvas.width = 350;
        canvas.height = 450;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 350, Math.random() * 450);
            ctx.bezierCurveTo(rid * 10, i * 20, 350 - (i*10), 450, Math.random() * 350, Math.random() * 450);
            ctx.stroke();
        }
        return canvas.toDataURL();
    },

    enableKiosk() {
        document.body.classList.add('kiosk-mode');
        this.toggleView();
        document.getElementById('viewToggleBtn').classList.add('hidden');
    },

    showSafePath() {
        if (this.view !== 'reg') return;
        const overlay = document.createElement('div');
        overlay.id = 'safePathOverlay';
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(127,29,29,0.9); z-index:20000; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; pointer-events:none;';
        overlay.innerHTML = `
            <i data-lucide="map" style="width:80px; height:80px; margin-bottom:2rem; animation: pulse 1s infinite;"></i>
            <h1 style="color:white; font-size:2rem; text-align:center;">DANGER: EVACUATION IN PROGRESS</h1>
            <p style="margin-top:1rem; font-size:1.2rem; font-weight:800; color:#f87171;">FOLLOW THE RED INDICATORS ON THE FLOOR</p>
            <div style="margin-top:3rem; padding: 2rem; border:4px dashed white; border-radius:20px;">
                <p style="font-size:1.5rem;">NEXT STEP: PROCEED TO EXIT B</p>
            </div>
        `;
        document.body.appendChild(overlay);
        app.initLucide();
    },

    hideSafePath() {
        const el = document.getElementById('safePathOverlay');
        if (el) el.remove();
    }
};

window.visitors = visitors;
window.addEventListener('DOMContentLoaded', () => visitors.init());
if ('Notification' in window) Notification.requestPermission();

// Sync with Global SOS
const syncChannel = new BroadcastChannel('visitor_alert');
syncChannel.onmessage = (e) => {
    if (e.data === 'SOS_START') window.visitors.showSafePath();
    if (e.data === 'SOS_STOP') window.visitors.hideSafePath();
};
