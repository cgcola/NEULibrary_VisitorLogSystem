import { UI } from './modules/ui.js';
import { initAuth } from './controllers/authController.js';
import { initEntrance } from './controllers/entranceTerminal.js';
import { initExit } from './controllers/exitTerminal.js';
import { auth } from './config/firebase.js'; 
import { signOut } from 'firebase/auth'; 

// Helper: Check if library is currently open
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

// 🚀 PREMIUM UI: Centered Modal Overlay
export function showCenteredAlert(title, message, icon = 'bi-shield-lock-fill') {
    // Remove any existing modal to prevent stacking
    const existing = document.getElementById('premium-overlay-modal');
    if (existing) existing.remove();

    const modalHtml = `
        <div id="premium-overlay-modal" class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
             style="background: rgba(0, 0, 0, 0.5); z-index: 9999; backdrop-filter: blur(5px); opacity: 0; transition: opacity 0.3s ease;">
            <div class="bg-white p-5 rounded-4 shadow-lg text-center mx-3 border-top border-danger border-5" 
                 style="max-width: 450px; transform: scale(0.8); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);" id="premium-modal-card">
                <i class="bi ${icon} text-danger mb-3 d-block" style="font-size: 4rem;"></i>
                <h3 class="fw-bold text-dark mb-3">${title}</h3>
                <p class="text-secondary mb-4" style="font-size: 1.1rem; line-height: 1.6;">${message}</p>
                <button class="btn btn-danger btn-lg px-5 rounded-pill fw-bold shadow-sm" id="btn-close-modal">Understood</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const overlay = document.getElementById('premium-overlay-modal');
    const card = document.getElementById('premium-modal-card');
    const closeBtn = document.getElementById('btn-close-modal');

    // Trigger smooth fade-in and bounce animation
    setTimeout(() => {
        overlay.style.opacity = '1';
        card.style.transform = 'scale(1)';
    }, 10);

    // Smooth fade-out and remove on close
    closeBtn.onclick = () => {
        overlay.style.opacity = '0';
        card.style.transform = 'scale(0.8)';
        setTimeout(() => overlay.remove(), 300);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const savedRole = localStorage.getItem('libraryDeviceRole');

    if (savedRole) {
        restoreTerminalSession(savedRole);
    } else {
        UI.showScreen('deviceSetup');
    }

    // Globally activate all "Change Terminal" (gear) buttons
    document.body.addEventListener('click', (e) => {
        const resetBtn = e.target.closest('.btn-reset-device') || e.target.closest('#btn-change-terminal');
        if (resetBtn) {
            e.preventDefault();
            localStorage.removeItem('libraryDeviceRole');
            location.reload(); 
        }
    });

    const btnEntrance = document.getElementById('set-entrance');
    const btnExit = document.getElementById('set-exit');
    const btnAdmin = document.getElementById('set-admin');

    const closedMessage = `The library is currently closed.<br><br><strong>Operating Hours:</strong><br>M/T/W/F: 7:00 AM - 7:00 PM<br>TH/S: 7:00 AM - 6:00 PM`;

    if (btnEntrance) {
        btnEntrance.onclick = (e) => {
            if (!isLibraryOpen()) {
                e.preventDefault();
                showCenteredAlert('Library Closed', closedMessage, 'bi-clock-fill');
                return;
            }
            localStorage.setItem('libraryDeviceRole', 'entrance');
            initEntrance();      
            initAuth('entrance'); 
        };
    }

    if (btnExit) {
        btnExit.onclick = (e) => {
            // Time Shield applied to Exit Button!
            if (!isLibraryOpen()) {
                e.preventDefault();
                showCenteredAlert('Library Closed', closedMessage, 'bi-clock-fill');
                return;
            }
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