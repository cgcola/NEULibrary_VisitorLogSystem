import { DB } from '../../modules/database.js';
import { loadAdminDashboard } from './adminController.js';

export function initUsers(allUsers) {
    const list = document.getElementById('admin-users-list');
    list.innerHTML = '';
    
    allUsers.forEach(u => {
        const isBlocked = u.isBlocked;
        const statusBadge = isBlocked ? `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger">Blocked</span>` : `<span class="badge bg-success bg-opacity-10 text-success border border-success">Active</span>`;
        const btnClass = isBlocked ? 'btn-outline-success' : 'btn-outline-danger';
        const btnText = isBlocked ? 'Unblock' : 'Block';
        const role = u.userType ? u.userType.toUpperCase() : 'STUDENT';

        const tr = document.createElement('tr');
        tr.dataset.search = `${u.name?.toLowerCase() || ''} ${u.email.toLowerCase()} ${u.collegeOrOffice?.toLowerCase() || ''} ${role.toLowerCase()}`;
        tr.innerHTML = `
            <td class="fw-bold text-dark">${u.name || 'N/A'}</td>
            <td>${u.email}</td>
            <td><span class="badge bg-secondary">${role}</span></td>
            <td>${u.collegeOrOffice || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td class="text-end"><button class="btn btn-sm ${btnClass} px-3 fw-bold btn-toggle-block" data-uid="${u.id}" data-blocked="${isBlocked}">${btnText}</button></td>`;
        list.appendChild(tr);
    });

    document.querySelectorAll('.btn-toggle-block').forEach(btn => {
        btn.onclick = async (e) => {
            if (confirm("Confirm change of user access status?")) {
                e.target.disabled = true;
                await DB.toggleBlockStatus(e.target.dataset.uid, e.target.dataset.blocked !== 'true');
                // Call back to master controller to refresh all data cleanly
                loadAdminDashboard(); 
            }
        };
    });

    // Clean up event listeners by cloning
    const searchInput = document.getElementById('admin-user-search');
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);

    newSearchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        Array.from(list.children).forEach(row => row.style.display = row.dataset.search.includes(term) ? '' : 'none');
    });
}