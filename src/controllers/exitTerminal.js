import { UI } from '../modules/ui.js';
import { DB } from '../modules/database.js';

export function initExit() {
    loadExitTerminal();
    
    // Ensure the settings button on exit screen can return to main menu
    document.querySelectorAll('.btn-reset-device').forEach(btn => {
        btn.onclick = () => location.reload();
    });
}

async function loadExitTerminal() {
    UI.showScreen('exitTerminal');
    const list = document.getElementById('active-users-list');
    const searchInput = document.getElementById('exit-search-input');
    
    list.innerHTML = '<tr><td colspan="6" class="text-center p-5 fs-5 text-muted">Loading active visitors...</td></tr>';
    
    try {
        const activeDocs = await DB.getActiveVisits();
        list.innerHTML = ''; 
        if (activeDocs.empty) { 
            list.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-5 fs-5">Library empty.</td></tr>'; 
            return; 
        }

        activeDocs.forEach(docSnap => {
            const data = docSnap.data();
            const timeIn = data.timeIn ? data.timeIn.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now';
            const role = data.userType ? data.userType.toUpperCase() : 'STUDENT';
            
            const tr = document.createElement('tr');
            tr.className = 'active-user-row bg-white border-bottom';
            tr.dataset.search = `${data.name?.toLowerCase() || ''} ${data.email?.toLowerCase() || ''} ${data.college?.toLowerCase() || ''} ${role.toLowerCase()}`;
            
            // Populating the 6 columns: Name | Email | Role | College | Time In | Action
            tr.innerHTML = `
                <td class="text-end pe-4 py-3">
                    <button class="btn btn-warning fw-bold px-4 py-2 btn-checkout shadow-sm rounded-pill hover-lift">Sign Out</button>
                </td>
                <td class="fw-bold fs-6 text-dark ps-4 py-3">${data.name || 'N/A'}</td>
                <td class="text-muted py-3">${data.email || 'N/A'}</td>
                <td class="py-3"><span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary">${role}</span></td>
                <td class="py-3"><span class="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1">${data.college || 'N/A'}</span></td>
                <td class="fw-medium text-dark py-3">${timeIn}</td>`;
                
            tr.querySelector('.btn-checkout').onclick = () => handleCheckout(docSnap.id, data.name, tr);
            list.appendChild(tr);
        });

        // Re-apply search listener cleanly
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        newSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.active-user-row').forEach(row => { 
                row.classList.toggle('d-none', !row.dataset.search.includes(term)); 
            });
        });
        
    } catch (e) { 
        console.error("Exit Terminal Error:", e); 
        list.innerHTML = '<tr><td colspan="6" class="text-center text-danger p-5 fs-5">Error loading data.</td></tr>';
    }
}

async function handleCheckout(visitId, name, rowElement) {
    const btn = rowElement.querySelector('.btn-checkout');
    btn.disabled = true; 
    btn.innerText = "Signing out...";
    
    try {
        await DB.checkoutVisit(visitId);
        
        document.getElementById('exit-table-container').classList.add('d-none');
        document.getElementById('exit-success-name').innerText = name || "Visitor";
        document.getElementById('exit-success').classList.remove('d-none');
        
        setTimeout(() => {
            document.getElementById('exit-table-container').classList.remove('d-none');
            document.getElementById('exit-success').classList.add('d-none');
            
            const searchBox = document.getElementById('exit-search-input');
            if (searchBox) searchBox.value = ""; 
            
            loadExitTerminal(); 
        }, 2000); 
        
    } catch (error) { 
        console.error("Firebase Checkout Error:", error);
        alert("Checkout Failed: " + (error.message || error)); 
        btn.disabled = false; 
        btn.innerText = "Sign Out";
    }
}