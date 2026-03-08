import { auth, provider } from '../config/firebase.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { UI } from '../modules/ui.js';
import { DB } from '../modules/database.js';
import { setupVisitLogging } from './entranceTerminal.js';
import { initAdmin, loadAdminDashboard } from './admin/adminController.js';

provider.setCustomParameters({ 
    hd: "neu.edu.ph",
    prompt: 'select_account' 
});

export function initAuth(deviceRole) {
    document.getElementById('btn-login').onclick = () => signInWithPopup(auth, provider);

    const handleLogout = async () => { await signOut(auth); location.reload(); };
    const btnLogoutDesktop = document.getElementById('btn-logout');
    const btnLogoutMobile = document.getElementById('btn-logout-mobile');
    const btnChangeTerminal = document.getElementById('btn-change-terminal'); 

    if (btnLogoutDesktop) btnLogoutDesktop.onclick = handleLogout;
    if (btnLogoutMobile) btnLogoutMobile.onclick = handleLogout;
    if (btnChangeTerminal) btnChangeTerminal.onclick = () => location.reload(); 

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (!user.email.endsWith("@neu.edu.ph")) {
                alert("Institutional Email Only!");
                await signOut(auth);
                return;
            }
            handleManualRouting(user, deviceRole);
        } 
    });
}

async function handleManualRouting(user, deviceRole) {
    const userData = await DB.getUser(user.uid);

    if (!userData) {
        UI.showScreen('userFlow');
        UI.toggleSubSection('onboarding');
        setupOnboarding(user);
    } else {
        if (userData.isBlocked) { 
            alert("ACCESS DENIED: Account Blocked."); 
            await signOut(auth); 
            UI.showScreen('login');
            return; 
        }

        // ADMIN LOGIN LOGIC
        if (deviceRole === 'admin') {
            if (userData.role === 'admin') {
                // Success: Load Admin Dashboard
                document.getElementById('admin-user-name').innerText = userData.name || "Admin";
                UI.showScreen('admin');
                initAdmin();
                loadAdminDashboard();
            } else {
                // FAILED: User is NOT an admin
                await signOut(auth); // Log them out immediately
                alert("⚠️ ACCESS DENIED\n\nYou do not have Administrator privileges for this portal.\n\nIf you are trying to log inside the library to study or read, please click the gear icon to return to the main menu and select 'ENTRANCE'.");
                location.reload(); // Refresh the page to reset the terminal
            }
        } 
        // ENTRANCE LOGIN LOGIC
        else if (deviceRole === 'entrance') {
            const activeSessionUser = { 
                uid: user.uid, 
                email: user.email, 
                name: userData.name || user.displayName, 
                collegeOrOffice: userData.collegeOrOffice,
                userType: userData.userType || 'student'
            };
            UI.showScreen('userFlow');
            UI.toggleSubSection('visit');
            setupVisitLogging(activeSessionUser);
        }
    }
}

function setupOnboarding(user) {
    const nameInput = document.getElementById('onboard-full-name');
    nameInput.value = user.displayName || ""; 

    document.getElementById('user-type-select').addEventListener('change', (e) => {
        const wrapper = document.getElementById('onboard-college-wrapper');
        const collegeSelect = document.getElementById('college-select');
        if (e.target.value === 'staff') {
            wrapper.classList.add('d-none');
            collegeSelect.value = 'N/A'; 
        } else {
            wrapper.classList.remove('d-none');
            collegeSelect.value = ''; 
        }
    });

    document.getElementById('btn-save-profile').onclick = async () => {
        const fullName = nameInput.value.trim();
        const uType = document.getElementById('user-type-select').value;
        const college = document.getElementById('college-select').value;
        
        if (!fullName) return alert("Please enter your Full Name.");
        if (!uType || !college) return alert("Please select your Role and College.");
        
        const finalCollege = college === 'N/A' ? 'University Office' : college;
        const saveBtn = document.getElementById('btn-save-profile');
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Saving... <i class="bi bi-hourglass-split ms-2"></i>';

        try {
            await DB.createUser(user.uid, { 
                email: user.email, 
                name: fullName, 
                collegeOrOffice: finalCollege,
                userType: uType
            });
            
            const activeSessionUser = { uid: user.uid, email: user.email, name: fullName, collegeOrOffice: finalCollege, userType: uType };
            UI.toggleSubSection('visit');
            setupVisitLogging(activeSessionUser);
            
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save & Continue <i class="bi bi-arrow-right ms-2"></i>';
            
        } catch(e) {
            console.error(e);
            alert("Error saving profile.");
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save & Continue <i class="bi bi-arrow-right ms-2"></i>';
        }
    };
}