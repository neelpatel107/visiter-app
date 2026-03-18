/**
 * Visitor Check-In System - Ultra Stable IndexedDB Manager
 */

const DB_NAME = 'VisiCheck_V2';
const DB_VERSION = 1;

class DatabaseManager {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Users Store
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('username', 'username', { unique: true });
                }

                // Visitors Store
                if (!db.objectStoreNames.contains('visitors')) {
                    const visitorStore = db.createObjectStore('visitors', { keyPath: 'id', autoIncrement: true });
                    visitorStore.createIndex('status', 'status', { unique: false });
                    visitorStore.createIndex('idNumber', 'idNumber', { unique: false });
                }

                // Employees Store
                if (!db.objectStoreNames.contains('employees')) {
                    db.createObjectStore('employees', { keyPath: 'id', autoIncrement: true });
                }

                // Blacklist Store
                if (!db.objectStoreNames.contains('blacklist')) {
                    const blStore = db.createObjectStore('blacklist', { keyPath: 'id', autoIncrement: true });
                    blStore.createIndex('idNumber', 'idNumber', { unique: true });
                }

                // Logs
                if (!db.objectStoreNames.contains('logs')) {
                    db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = async (event) => {
                this.db = event.target.result;
                await this.seedAll();
                resolve(this.db);
            };

            request.onerror = (event) => reject(event.target.error);
        });
    }

    async seedAll() {
        const users = await this.getAll('users');
        if (users.length === 0) {
            await this.add('users', { username: 'admin', password: 'password123', name: 'System Admin', role: 'admin' });
        }

        const residents = await this.getAll('employees');
        if (residents.length === 0) {
            const staff = [
                { name: 'Amit Sharma', dept: 'A-101 (Block A)' },
                { name: 'Priya Patel', dept: 'A-402 (Block A)' },
                { name: 'Rajesh Kumar', dept: 'B-205 (Block B)' },
                { name: 'Sanya Gupta', dept: 'B-303 (Block B)' },
                { name: 'Vikram Singh', dept: 'C-104 (Block C)' },
                { name: 'Anjali Desai', dept: 'C-501 (Block C)' },
                { name: 'Rahul Mehta', dept: 'D-102 (Block D)' },
                { name: 'Kushal Parekh', dept: 'D-202 (Block D)' },
                { name: 'Sneha Reddy', dept: 'E-101 (Block E)' },
                { name: 'Vijay Iyer', dept: 'E-304 (Block E)' },
                { name: 'Pooja Verma', dept: 'F-202 (Block F)' },
                { name: 'Arjun Kapoor', dept: 'F-405 (Block F)' }
            ];
            for (const s of staff) await this.add('employees', s);
        }

        const bl = await this.getAll('blacklist');
        if (bl.length === 0) {
            await this.add('blacklist', { idNumber: 'BLACK-001', reason: 'Previous Incident' });
        }

        const visitors = await this.getAll('visitors');
        if (visitors.length === 0) {
            await this.seed50Records();
        }
    }

    async seed50Records() {
        console.log('Generating 50 realistic Indian records...');
        const firstNames = ['Suresh', 'Deepak', 'Karan', 'Meena', 'Sunita', 'Rohan', 'Aditya', 'Ishaan', 'Kavita', 'Ritu', 'Manish', 'Sanjay', 'Preeti', 'Nitin', 'Alok'];
        const lastNames = ['Joshi', 'Trivedi', 'Agarwal', 'Chauhan', 'Pandey', 'Malhotra', 'Bose', 'Nair', 'Kulkarni', 'Dubey', 'Saxena', 'Gill', 'Yadav'];
        const purposes = ['Guest', 'Zomato Delivery', 'Swiggy Delivery', 'Amazon Package', 'Flipkart Delivery', 'Urban Company Service', 'Milk Delivery', 'Daily Help (Maid)', 'Maintenance (Plumber)', 'Internet Service (Airtel)'];
        const companies = ['Swiggy', 'Zomato', 'Amazon', 'Flipkart', 'Dunzo', 'BlueDart', 'Porter', 'Urban Company', 'BigBasket', 'Blinkit', 'Airtel', 'TATA Play'];
        
        const residents = [
            { name: 'Amit Sharma', flat: 'A-101' }, { name: 'Priya Patel', flat: 'A-402' },
            { name: 'Rajesh Kumar', flat: 'B-205' }, { name: 'Sanya Gupta', flat: 'B-303' },
            { name: 'Vikram Singh', flat: 'C-104' }, { name: 'Anjali Desai', flat: 'C-501' },
            { name: 'Rahul Mehta', flat: 'D-102' }, { name: 'Kushal Parekh', flat: 'D-202' }
        ];

        for (let i = 1; i <= 50; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const appPurpose = purposes[i % purposes.length];
            const isDelivery = appPurpose.includes('Delivery') || appPurpose.includes('Package') || appPurpose.includes('Service');
            const status = i > 45 ? 'active' : 'checked-out';
            const resident = residents[Math.floor(Math.random() * residents.length)];

            await this.add('visitors', {
                name: `${firstName} ${lastName}`,
                phone: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
                idNumber: `VIN-${2000 + i}`,
                purpose: appPurpose,
                host: isDelivery ? `Security Guard (Gate B)` : `${resident.name} (${resident.flat})`,
                company: isDelivery ? companies[Math.floor(Math.random() * companies.length)] : 'Private Visit',
                photo: `https://i.pravatar.cc/150?u=society_v3_${i}`,
                status: status,
                checkIn: new Date(Date.now() - (i * 3600000)).toISOString(),
                checkOut: status === 'checked-out' ? new Date(Date.now() - (i * 1800000)).toISOString() : null,
                room: isDelivery ? 'Building Perimeter' : `Block ${resident.flat.split('-')[0]}`
            });
        }
    }

    async add(store, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readwrite');
            const os = tx.objectStore(store);
            const req = os.add(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async getAll(store) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readonly');
            const os = tx.objectStore(store);
            const req = os.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async getById(store, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readonly');
            const os = tx.objectStore(store);
            const req = os.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async update(store, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readwrite');
            const os = tx.objectStore(store);
            const req = os.put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async delete(store, id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readwrite');
            const os = tx.objectStore(store);
            const req = os.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async findBy(store, index, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([store], 'readonly');
            const os = tx.objectStore(store);
            const idx = os.index(index);
            const req = idx.get(value);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async purgeOldData(days = 30) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['visitors'], 'readwrite');
            const os = tx.objectStore('visitors');
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);

            const req = os.openCursor();
            let purged = 0;
            req.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    const visitor = cursor.value;
                    if (new Date(visitor.checkIn) < cutoff) {
                        cursor.delete();
                        purged++;
                    }
                    cursor.continue();
                } else {
                    resolve(purged);
                }
            };
            req.onerror = () => reject(req.error);
        });
    }

    async factoryReset() {
        const stores = Array.from(this.db.objectStoreNames);
        const tx = this.db.transaction(stores, 'readwrite');
        stores.forEach(s => tx.objectStore(s).clear());
        return new Promise((resolve) => {
            tx.oncomplete = async () => {
                await this.seedAll();
                resolve();
            };
        });
    }
}

window.db = new DatabaseManager();
window.db.init();
