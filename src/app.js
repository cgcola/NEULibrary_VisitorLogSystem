import { UI } from './modules/ui.js';
import { initAuth } from './controllers/authController.js';
import { initEntrance } from './controllers/entranceTerminal.js';
import { initExit } from './controllers/exitTerminal.js';
import { auth } from './config/firebase.js'; 
import { signOut } from 'firebase/auth'; 

document.addEventListener('DOMContentLoaded', () => {
    // Check if this device already has an assigned role saved in storage
    const savedRole = localStorage.getItem('libraryDeviceRole');

    if (savedRole) {
        console.log("Restoring terminal session:", savedRole);
        restoreTerminalSession(savedRole);
    } else {
        // No role saved, show the initial choice screen
        UI.showScreen('deviceSetup');
    }

    // Globally activate all "Change Terminal" (gear) buttons
    document.body.addEventListener('click', (e) => {
        // Find if the clicked element (or its parent) is the reset button
        const resetBtn = e.target.closest('.btn-reset-device') || e.target.closest('#btn-change-terminal');
        
        if (resetBtn) {
            e.preventDefault();
            localStorage.removeItem('libraryDeviceRole');
            location.reload(); // Instantly go back to the landing page
        }
    });

    // Setup button listeners for terminal roles
    const btnEntrance = document.getElementById('set-entrance');
    const btnExit = document.getElementById('set-exit');
    const btnAdmin = document.getElementById('set-admin');

    if (btnEntrance) {
        btnEntrance.onclick = () => {
            localStorage.setItem('libraryDeviceRole', 'entrance');
            initEntrance();      
            initAuth('entrance'); 
        };
    }

    if (btnExit) {
        btnExit.onclick = () => {
            localStorage.setItem('libraryDeviceRole', 'exit');
            initExit(); 
        };
    }

    if (btnAdmin) {
        btnAdmin.onclick = () => {
            localStorage.setItem('libraryDeviceRole', 'admin');
            UI.showScreen('login');
            initAuth('admin'); 
        };
    }
});

// Helper to bypass the setup screen on reload
function restoreTerminalSession(role) {
    if (role === 'entrance') {
        initEntrance();
        initAuth('entrance');
    } else if (role === 'exit') {
        initExit();
    } else if (role === 'admin') {
        UI.showScreen('login');
        initAuth('admin');
    }
}