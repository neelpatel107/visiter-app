/**
 * Persistence & Session Manager
 */

const auth = {
    async login(username, password) {
        await window.db.init();
        const user = await window.db.findBy('users', 'username', username);

        if (user && user.password === password) {
            localStorage.setItem('visitor_session', JSON.stringify({
                id: user.id,
                name: user.name,
                role: user.role,
                loginTime: new Date()
            }));
            return true;
        }
        return false;
    },

    async verifyPattern(pattern) {
        // Mock pattern check for demo: sequence 1,2,3 is success
        if (pattern === '012') {
            const user = { name: 'Admin', role: 'admin' };
            localStorage.setItem('visitor_session', JSON.stringify({
                name: user.name,
                role: user.role,
                loginTime: new Date()
            }));
            return true;
        }
        return false;
    },

    logout() {
        localStorage.removeItem('visitor_session');
        window.location.href = 'login.html';
    },

    checkAuth() {
        const session = localStorage.getItem('visitor_session');
        if (!session && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return session ? JSON.parse(session) : null;
    }
};

window.auth = auth;
