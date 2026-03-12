import { UI } from '../modules/ui.js';
import { DB } from '../modules/database.js';

// Global variables to hold the context of the user trying to exit
let pendingExitVisitId = null;
let pendingExitCorrectEmail = null;
let pendingExitName = null;

let exitListenerUnsubscribe = null;
let currentSearchTerm = ''; // Keeps track of what is typed in the search bar

export function initExit() {
    // Clean up any old listener if the user re-initializes the screen
    if (exitListenerUnsubscribe) exitListenerUnsubscribe();
    
    loadExitTerminal();
    setupExitSecurity();
    
    // Ensure the settings button on exit screen can return to main menu
    document.querySelectorAll('.btn-reset-device').forEach(btn => {
        btn.onclick = () => {
            if (exitListenerUnsubscribe) exitListenerUnsubscribe(); // Stop listening before leaving
            location.reload();
        };
    });
}

function loadExitTerminal() {
    UI.showScreen('exitTerminal');
    const list = document.getElementById('active-users-list');
    const searchInput = document.getElementById('exit-search-input');
    
    // Cleanly setup the search listener once
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    newSearchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.toLowerCase();
        applySearchFilter();
    });

    list.innerHTML = '<tr><td colspan="6" class="text-center p-5 fs-5 text-muted"><div class="spinner-border spinner-border-sm me-2 text-primary" role="status"></div> Connecting to live feed...</td></tr>';
    
    try {
        // 🚀 THE MAGIC: Real-time listener!
        exitListenerUnsubscribe = DB.listenToActiveVisits((activeDocs) => {
            list.innerHTML = ''; 
            
            if (activeDocs.length === 0) { 
                list.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-5 fs-5">Library is currently empty.</td></tr>'; 
                return; 
            }

            // Sort newest entries to the top locally for better UX
            const sortedDocs = activeDocs.sort((a, b) => {
                const timeA = a.data().timeIn ? a.data().timeIn.toMillis() : 0;
                const timeB = b.data().timeIn ? b.data().timeIn.toMillis() : 0;
                return timeB - timeA;
            });

            sortedDocs.forEach(docSnap => {
                const data = docSnap.data();
                const timeIn = data.timeIn ? data.timeIn.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now';
                const role = data.userType ? data.userType.toUpperCase() : 'STUDENT';
                
                const tr = document.createElement('tr');
                tr.className = 'active-user-row bg-white border-bottom';
                tr.dataset.search = `${data.name?.toLowerCase() || ''} ${data.email?.toLowerCase() || ''} ${data.college?.toLowerCase() || ''} ${role.toLowerCase()}`;
                
                tr.innerHTML = `
                    <td class="text-center py-3">
                        <button class="btn btn-warning fw-bold px-4 py-2 btn-checkout shadow-sm rounded-pill hover-lift">Sign Out</button>
                    </td>
                    <td class="fw-bold fs-6 text-dark text-center py-3">${data.name || 'N/A'}</td>
                    <td class="text-center py-3"><span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary">${role}</span></td>
                    <td class="text-center py-3"><span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1">${data.college || 'N/A'}</span></td>
                    <td class="text-center fw-medium text-dark py-3">${timeIn}</td>`;
                    
                // Open Modal Instead of Checking Out
                tr.querySelector('.btn-checkout').onclick = () => {
                    pendingExitVisitId = docSnap.id;
                    pendingExitCorrectEmail = data.email;
                    pendingExitName = data.name;
                    
                    // Reset modal state
                    const emailInput = document.getElementById('verify-exit-email');
                    emailInput.value = '';
                    emailInput.classList.remove('is-invalid');
                    document.getElementById('verify-exit-error').classList.add('d-none');
                    
                    // Show modal
                    const exitModal = new bootstrap.Modal(document.getElementById('exitSecurityModal'));
                    exitModal.show();
                };

                list.appendChild(tr);
            });

            // Re-apply whatever the user typed in the search bar instantly
            applySearchFilter();
        });
        
    } catch (e) { 
        console.error("Exit Terminal Error:", e); 
        list.innerHTML = '<tr><td colspan="6" class="text-center text-danger p-5 fs-5"><i class="bi bi-exclamation-triangle-fill me-2"></i> Error connecting to live feed.</td></tr>';
    }
}

// Helper function to handle the search bar logic
function applySearchFilter() {
    document.querySelectorAll('.active-user-row').forEach(row => { 
        row.classList.toggle('d-none', !row.dataset.search.includes(currentSearchTerm)); 
    });
}

// The logic that powers the Security Modal
function setupExitSecurity() {
    const btnConfirm = document.getElementById('btn-confirm-exit');
    const emailInput = document.getElementById('verify-exit-email');
    const errorMsg = document.getElementById('verify-exit-error');
    
    if (btnConfirm) {
        btnConfirm.onclick = async () => {
            const typedEmail = emailInput.value.trim().toLowerCase();
            
            // Check if the typed email exactly matches the database email
            if (typedEmail === pendingExitCorrectEmail.toLowerCase()) {
                
                btnConfirm.disabled = true;
                btnConfirm.innerHTML = '<i class="bi bi-hourglass-split"></i> Verifying...';
                
                try {
                    // It's a match! Proceed with actual checkout
                    await DB.checkoutVisit(pendingExitVisitId);
                    
                    // Hide the Modal
                    const modalElement = document.getElementById('exitSecurityModal');
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    modalInstance.hide();
                    
                    // Show Success Screen
                    document.getElementById('exit-search-input').value = '';
                    currentSearchTerm = ''; // Reset the internal search tracker too
                    
                    document.getElementById('exit-table-container').classList.add('d-none');
                    document.getElementById('exit-success').classList.remove('d-none');
                    document.getElementById('exit-success-name').innerText = pendingExitName;
                    
                    // Reset terminal after 3 seconds
                    // Live Listener
                    setTimeout(() => {
                        document.getElementById('exit-success').classList.add('d-none');
                        document.getElementById('exit-table-container').classList.remove('d-none');
                        btnConfirm.disabled = false;
                        btnConfirm.innerHTML = 'Confirm Sign-Out';
                    }, 3000);

                } catch (error) {
                    console.error("Firebase Checkout Error:", error);
                    alert("Checkout Failed. Please check your connection."); 
                    btnConfirm.disabled = false;
                    btnConfirm.innerHTML = 'Confirm Sign-Out';
                }
                
            } else {
                // Emails don't match!
                errorMsg.classList.remove('d-none');
                emailInput.classList.add('is-invalid');
                
                emailInput.classList.add('shake-animation');
                setTimeout(() => emailInput.classList.remove('shake-animation'), 500);
            }
        };
    }
}