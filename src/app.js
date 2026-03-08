import { UI } from './modules/ui.js';
import { initAuth } from './controllers/authController.js';
import { initEntrance } from './controllers/entranceTerminal.js';
import { initExit } from './controllers/exitTerminal.js';
import { auth } from './config/firebase.js'; 
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; 

document.addEventListener('DOMContentLoaded', async () => {
    // Force a clean slate whenever the main setup screen loads
    try {
        await signOut(auth);
    } catch (e) {
        console.log("No active session to clear.");
    }

    // Show the device setup screen by default on load
    UI.showScreen('deviceSetup');

    // GLOBALLY activate all "Change Terminal" (gear) buttons
    document.querySelectorAll('.btn-reset-device').forEach(btn => {
        btn.onclick = () => location.reload();
    });

    // Setup button listeners for terminal roles
    const btnEntrance = document.getElementById('set-entrance');
    const btnExit = document.getElementById('set-exit');
    const btnAdmin = document.getElementById('set-admin');

    if (btnEntrance) {
        btnEntrance.onclick = () => {
            initEntrance();      
            initAuth('entrance'); 
        };
    }

    if (btnExit) {
        btnExit.onclick = () => {
            initExit(); 
        };
    }

    if (btnAdmin) {
        btnAdmin.onclick = () => {
            UI.showScreen('login');
            initAuth('admin'); 
        };
    }
});