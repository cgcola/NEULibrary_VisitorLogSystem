import { auth } from '../config/firebase.js';
import { signOut } from "firebase/auth";
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
        
        // 🚀 THE TIME SHIELD LOGIC
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const hour = now.getHours(); // 0 - 23 (Military Time)
        
        let isOpen = false;
        let scheduleText = "M/T/W/F: 7:00 AM - 7:00 PM\nTH/S: 7:00 AM - 6:00 PM";

        // Check Monday (1), Tuesday (2), Wednesday (3), Friday (5)
        if (day === 1 || day === 2 || day === 3 || day === 5) {
            if (hour >= 7 && hour < 19) isOpen = true; // 7 AM to 6:59 PM
        } 
        // Check Thursday (4) and Saturday (6)
        else if (day === 4 || day === 6) {
            if (hour >= 7 && hour < 18) isOpen = true; // 7 AM to 5:59 PM
        }

        if (!isOpen) {
            alert(`⛔ ENTRY DENIED\n\nThe library is currently closed. You cannot log a visit at this time.\n\nOperating Hours:\n${scheduleText}`);
            
            // Send them back to the login screen
            await signOut(auth);
            UI.showScreen('login');
            return; // Stops the database from logging the visit!
        }
        
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
            console.error(error);
            alert("Error saving visit."); 
            btnLog.disabled = false; 
            btnLog.innerHTML = 'Proceed Entry <i class="bi bi-door-open-fill ms-2"></i>';
        }
    };
}