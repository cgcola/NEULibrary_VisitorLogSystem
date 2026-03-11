import { UI } from './modules/ui.js';
import { initAuth } from './controllers/authController.js';
import { initEntrance } from './controllers/entranceTerminal.js';
import { initExit } from './controllers/exitTerminal.js';
import { auth } from './config/firebase.js'; 
import { signOut } from 'firebase/auth'; 

// Check if library is currently open
export function isLibraryOpen() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    if (day === 1 || day === 2 || day === 3 || day === 5) {
        return (hour >= 7 && hour < 19); // M, T, W, F: 7:00 AM - 6:59 PM
    } else if (day === 4 || day === 6) {
        return (hour >= 7 && hour < 18); // TH, S: 7:00 AM - 5:59 PM
    }
    return false; // Sunday
}

// 🚀 NEW: Inject a beautiful error message onto the screen
export function showInlineError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) {
        // Fallback just in case the ID is slightly different in your HTML
        alert(message.replace(/<br>/g, '\n'));
        return;
    }

    // Remove any existing error message so they don't stack up infinitely
    const existingError = container.querySelector('.custom-inline-error');
    if (existingError) existingError.remove();

    const alertHtml = `
        <div class="custom-inline-error alert alert-danger alert-dismissible fade show mt-4 shadow-sm text-start" role="alert" style="max-width: 500px; margin: 0 auto; border-left: 5px solid #dc3545;">
            <strong><i class="bi bi-exclamation-octagon-fill me-2"></i>Access Denied</strong><br>
            <span class="small">${message}</span>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', alertHtml);
}

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
        btnEntrance.onclick = (e) => {
            // Time Shield
            if (!isLibraryOpen()) {
                e.preventDefault(); // Stop them from clicking
                showInlineError('deviceSetup', 'The library is currently closed. Operating Hours:<br>M/T/W/F: 7:00 AM - 7:00 PM<br>TH/S: 7:00 AM - 6:00 PM');
                return;
            }

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