import { auth } from '../config/firebase.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { UI } from '../modules/ui.js';
import { DB } from '../modules/database.js';

export function initEntrance() {
    // Safely skip straight to the Login screen
    UI.showScreen('login');

    // Make sure the "Gear" (Change Terminal) icon reloads the app
    document.querySelectorAll('.btn-reset-device').forEach(btn => {
        btn.onclick = () => location.reload();
    });
}

export function setupVisitLogging(userData) {
    const btnLog = document.getElementById('btn-log-visit');
    
    // Reset buttons from previous user
    document.querySelectorAll('.reason-btn').forEach(b => b.classList.remove('active'));

    // Handle button selections
    document.querySelectorAll('.reason-btn').forEach(btn => {
        btn.onclick = () => btn.classList.toggle('active');
    });

    btnLog.onclick = async () => {
        const activeButtons = document.querySelectorAll('.reason-btn.active');
        const selectedReasons = Array.from(activeButtons).map(b => b.dataset.reason);

        if (selectedReasons.length === 0) return alert("Select at least one activity.");
        
        btnLog.disabled = true; 
        btnLog.innerText = "Processing...";

        try {
            await DB.logVisit({ 
                uid: userData.uid, 
                name: userData.name, 
                email: userData.email, 
                college: userData.collegeOrOffice, 
                userType: userData.userType,
                reasons: selectedReasons 
            });

            // Show success animation
            UI.toggleSubSection('success');

            // Wait 3 seconds, log out the student, and loop cleanly back to login
            setTimeout(async () => {
                btnLog.disabled = false; 
                btnLog.innerHTML = 'Proceed Entry <i class="bi bi-door-open-fill ms-2"></i>';
                
                await signOut(auth);
                UI.showScreen('login');
                
            }, 3000);

        } catch (error) { 
            alert("Error saving visit."); 
            btnLog.disabled = false; 
            btnLog.innerHTML = 'Proceed Entry <i class="bi bi-door-open-fill ms-2"></i>';
        }
    };
}