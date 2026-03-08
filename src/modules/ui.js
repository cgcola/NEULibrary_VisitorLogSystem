export const UI = {
    wrappers: {
        terminal: document.getElementById('terminal-wrapper'),
        admin: document.getElementById('admin-wrapper')
    },
    screens: {
        deviceSetup: document.getElementById('device-setup'),
        login: document.getElementById('login-screen'),
        userFlow: document.getElementById('user-flow'),
        exitTerminal: document.getElementById('exit-terminal-screen'),
        
        onboarding: document.getElementById('onboarding-section'),
        visit: document.getElementById('visit-section'),
        success: document.getElementById('success-message')
    },

    showScreen(target) {
        this.wrappers.terminal.classList.add('d-none');
        this.wrappers.terminal.classList.remove('d-flex');
        this.wrappers.admin.classList.add('d-none');
        this.wrappers.admin.classList.remove('d-flex');

        Object.values(this.screens).forEach(el => {
            if (el) el.classList.add('d-none');
        });

        if (target === 'admin') {
            this.wrappers.admin.classList.remove('d-none');
            this.wrappers.admin.classList.add('d-flex');
        } else {
            this.wrappers.terminal.classList.remove('d-none');
            this.wrappers.terminal.classList.add('d-flex');
            if (this.screens[target]) {
                this.screens[target].classList.remove('d-none');
            }
        }
    },

    toggleSubSection(section) {
        this.screens.onboarding.classList.add('d-none');
        this.screens.visit.classList.add('d-none');
        this.screens.success.classList.add('d-none');
        
        if (this.screens[section]) {
            this.screens[section].classList.remove('d-none');
        }
    }
};