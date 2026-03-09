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
    let userData = await DB.getUser(user.uid);

    // DYNAMIC WHITELIST CHECK & AUTO-CREATION
    if (!userData) {
        const dynamicWhitelist = await DB.getAdminWhitelist();
        
        // Debugging logs so you can see if the whitelist is loading
        console.log("Loaded VIP List:", dynamicWhitelist);
        console.log("Current User:", user.email.toLowerCase());

        if (dynamicWhitelist.includes(user.email.toLowerCase())) {
            console.log("VIP Admin Detected! Bypassing registration...");

            // 1. Fetch raw name from Google
            let rawName = user.displayName || "Admin User";
            
            // 2. If it's reversed with a comma (Ola, Carl), flip it around
            if (rawName.includes(',')) {
                const parts = rawName.split(',');
                rawName = `${parts[1].trim()} ${parts[0].trim()}`;
            }
            
            // 3. Force Proper Casing (e.g. CARL -> Carl)
            const cleanName = rawName.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

            // Silently create their Admin profile in the background using the clean name
            await DB.createUser(user.uid, { 
                email: user.email, 
                name: cleanName, 
                collegeOrOffice: "University Library",
                userType: "staff",
                role: "admin" 
            });
            
            // Re-fetch their newly minted admin profile
            userData = await DB.getUser(user.uid);
        }
    }

    // Normal Routing Logic Continues
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

        if (deviceRole === 'admin') {
            if (userData.role === 'admin') {
                document.getElementById('admin-user-name').innerText = userData.name || "Admin";
                
                const profilePic = document.getElementById('admin-profile-pic');
                const profileIcon = document.getElementById('admin-profile-icon');
                
                if (user.photoURL && profilePic && profileIcon) {
                    profilePic.src = user.photoURL;
                    profilePic.classList.remove('d-none');
                    profileIcon.classList.add('d-none'); 
                }

                UI.showScreen('admin');
                initAdmin();
                loadAdminDashboard();
            } else {
                await signOut(auth); 
                alert("⚠️ ACCESS DENIED\n\nYou do not have Administrator privileges for this portal.\n\nIf you are trying to log inside the library to study or read, please click the gear icon to return to the main menu and select 'ENTRANCE'.");
                location.reload(); 
            }
        } 
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
    const displayName = user.displayName || "";
    const fNameInput = document.getElementById('onboard-first-name');
    const miInput = document.getElementById('onboard-mi');
    const lNameInput = document.getElementById('onboard-last-name');

    const formatProperName = (str) => {
        if (!str) return "";
        return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    };

    let firstName = "";
    let mi = "";
    let lastName = "";

    if (displayName.includes(',')) {
        const splitComma = displayName.split(',');
        lastName = formatProperName(splitComma[0].trim());
        
        let givenParts = splitComma[1].trim().split(' ');
        let lastGiven = givenParts[givenParts.length - 1];
        
        if (lastGiven && (lastGiven.length <= 2 || lastGiven.includes('.'))) {
            mi = lastGiven.replace(/\./g, '').toUpperCase() + '.'; 
            givenParts.pop(); 
        }
        firstName = formatProperName(givenParts.join(' '));
        
    } else {
        let parts = displayName.split(' ');
        let miIndex = parts.findIndex(p => (p.length === 2 && p.endsWith('.')) || p.length === 1);
        
        if (miIndex !== -1 && miIndex > 0 && miIndex < parts.length - 1) {
            firstName = formatProperName(parts.slice(0, miIndex).join(' '));
            mi = parts[miIndex].replace(/\./g, '').toUpperCase() + '.';
            lastName = formatProperName(parts.slice(miIndex + 1).join(' '));
        } else {
            firstName = formatProperName(parts[0] || "");
            lastName = formatProperName(parts.slice(1).join(' '));
        }
    }

    fNameInput.value = firstName;
    miInput.value = mi;
    lNameInput.value = lastName;

    miInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    miInput.addEventListener('blur', (e) => {
        let val = e.target.value.trim();
        if (val) {
            val = val.replace(/\./g, '') + '.';
            e.target.value = val;
        }
    });

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
        const rawFirst = fNameInput.value.trim();
        const rawMI = miInput.value.trim(); 
        const rawLast = lNameInput.value.trim();
        
        const uType = document.getElementById('user-type-select').value;
        const college = document.getElementById('college-select').value;
        
        if (!rawFirst || !rawLast) return alert("First Name and Last Name are required.");
        if (!uType) return alert("Please select your Account Role.");
        if (uType !== 'staff' && !college) return alert("Please select your College / Department.");
        
        const finalFullName = `${rawFirst} ${rawMI ? rawMI + ' ' : ''}${rawLast}`.trim();
        const finalCollege = (uType === 'staff' || college === 'N/A') ? 'University Office' : college;
        
        const saveBtn = document.getElementById('btn-save-profile');
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Saving... <i class="bi bi-hourglass-split ms-2"></i>';

        try {
            await DB.createUser(user.uid, { 
                email: user.email, 
                name: finalFullName, 
                collegeOrOffice: finalCollege,
                userType: uType
            });
            
            const activeSessionUser = { uid: user.uid, email: user.email, name: finalFullName, collegeOrOffice: finalCollege, userType: uType };
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