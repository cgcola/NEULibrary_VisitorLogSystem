import { DB } from '../../modules/database.js';

let currentUsersList = [];
let currentBookmark = null;
let currentFilters = { role: 'all', college: 'all', search: '' };
let searchTimeout = null;

export function initUsers(initialUsers, initialBookmark) {
    currentUsersList = initialUsers;
    currentBookmark = initialBookmark;
    
    renderUsersTable(currentUsersList);
    setupFilterListeners();
    setupLoadMoreButton();
}

function setupFilterListeners() {
    const roleFilter = document.getElementById('filter-user-role');
    const collegeFilter = document.getElementById('filter-user-college');
    const searchInput = document.getElementById('admin-user-search');

    if (roleFilter) {
        roleFilter.addEventListener('change', (e) => {
            currentFilters.role = e.target.value;
            if (currentFilters.role === 'staff') {
                collegeFilter.classList.add('d-none');
                currentFilters.college = 'all';
                collegeFilter.value = 'all';
            } else {
                collegeFilter.classList.remove('d-none');
            }
            triggerNewDatabaseSearch();
        });
    }

    if (collegeFilter) {
        collegeFilter.addEventListener('change', (e) => {
            currentFilters.college = e.target.value;
            triggerNewDatabaseSearch();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const rawSearch = e.target.value;
            currentFilters.search = rawSearch ? rawSearch.charAt(0).toUpperCase() + rawSearch.slice(1) : '';
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                triggerNewDatabaseSearch();
            }, 500);
        });
    }
}

async function triggerNewDatabaseSearch() {
    const tableBody = document.getElementById('admin-users-list');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-hourglass-split"></i> Searching Database...</td></tr>';
    
    currentBookmark = null;
    const data = await DB.getUsersPaginated(50, null, currentFilters);
    
    currentUsersList = data.users;
    currentBookmark = data.lastDoc;
    
    renderUsersTable(currentUsersList);
    updateLoadMoreButtonState(data.users.length);
}

function setupLoadMoreButton() {
    const btnLoadMore = document.getElementById('btn-load-more-users');
    if (!btnLoadMore) return;

    btnLoadMore.onclick = async () => {
        btnLoadMore.disabled = true;
        btnLoadMore.innerHTML = '<i class="bi bi-hourglass-split me-2"></i> Loading...';

        const nextData = await DB.getUsersPaginated(50, currentBookmark, currentFilters);

        if (nextData.users.length > 0) {
            currentUsersList = [...currentUsersList, ...nextData.users];
            currentBookmark = nextData.lastDoc;
            renderUsersTable(currentUsersList);
        }
        updateLoadMoreButtonState(nextData.users.length);
    };
}

function updateLoadMoreButtonState(newItemsCount) {
    const btnLoadMore = document.getElementById('btn-load-more-users');
    if (!btnLoadMore) return;

    if (newItemsCount < 50) {
        btnLoadMore.innerHTML = '<i class="bi bi-check2-circle me-2"></i> All Results Loaded';
        btnLoadMore.disabled = true;
        btnLoadMore.classList.replace('btn-outline-primary', 'btn-outline-secondary');
    } else {
        btnLoadMore.disabled = false;
        btnLoadMore.innerHTML = '<i class="bi bi-arrow-down-circle me-2"></i> Load More Users';
        btnLoadMore.classList.replace('btn-outline-secondary', 'btn-outline-primary');
    }
}

function renderUsersTable(users) {
    const list = document.getElementById('admin-users-list');
    if (!list) return;
    
    list.innerHTML = '';

    // Filter out Admins so they don't appear in the management list
    const manageableUsers = users.filter(u => u.role !== 'admin' && u.userType !== 'admin');

    if (manageableUsers.length === 0) {
        list.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted fw-bold">No manageable users found.</td></tr>';
        return;
    }

    manageableUsers.forEach((u, index) => {
        const isBlocked = u.isBlocked;
        const statusBadge = isBlocked ? `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger">Blocked</span>` : `<span class="badge bg-success bg-opacity-10 text-success border border-success">Active</span>`;
        const btnClass = isBlocked ? 'btn-outline-success' : 'btn-outline-danger';
        const btnText = isBlocked ? 'Unblock' : 'Block';
        const roleStr = u.userType ? u.userType.toUpperCase() : 'STUDENT';

        // 1. Create the Main User Row
        const trMain = document.createElement('tr');
        trMain.innerHTML = `
            <td class="fw-bold text-dark">${u.name || 'N/A'}</td>
            <td>${u.email}</td>
            <td><span class="badge bg-secondary">${roleStr}</span></td>
            <td>${u.collegeOrOffice || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-info px-2 me-1 btn-view-history" data-uid="${u.id}" data-email="${u.email}" title="View History">
                    <i class="bi bi-clock-history"></i>
                </button>
                <button class="btn btn-sm ${btnClass} px-3 fw-bold btn-toggle-block" data-uid="${u.id}" data-blocked="${isBlocked}">${btnText}</button>
            </td>`;
        
        // 2. Create the Hidden History Dropdown Row
        const trHistory = document.createElement('tr');
        trHistory.id = `history-row-${u.id}`;
        trHistory.classList.add('d-none'); // Hidden by default
        trHistory.innerHTML = `
            <td colspan="6" class="p-0 border-0 bg-light">
                <div class="p-3 shadow-inner border-bottom border-info border-3" style="max-height: 350px; overflow-y: auto;" id="history-content-${u.id}">
                    <div class="text-center text-muted small py-3"><i class="bi bi-hourglass-split"></i> Loading history...</div>
                </div>
            </td>`;

        list.appendChild(trMain);
        list.appendChild(trHistory);
    });

    // Re-attach logic using delegation or direct attachment
    list.querySelectorAll('.btn-toggle-block').forEach(btn => {
        btn.onclick = async (e) => {
            if (confirm("Confirm change of user access status?")) {
                const targetBtn = e.target;
                targetBtn.disabled = true;
                const uid = targetBtn.dataset.uid;
                const isCurrentlyBlocked = targetBtn.dataset.blocked === 'true';
                
                await DB.toggleBlockStatus(uid, !isCurrentlyBlocked);
                
                triggerNewDatabaseSearch(); 
            }
        };
    });

    // View History Logic
    list.querySelectorAll('.btn-view-history').forEach(btn => {
        btn.onclick = async (e) => {
            const targetBtn = e.target.closest('button');
            const uid = targetBtn.dataset.uid;
            const email = targetBtn.dataset.email;
            
            const historyRow = document.getElementById(`history-row-${uid}`);
            const contentDiv = document.getElementById(`history-content-${uid}`);

            if (!historyRow.classList.contains('d-none')) {
                historyRow.classList.add('d-none');
                targetBtn.classList.replace('btn-info', 'btn-outline-info');
                targetBtn.classList.remove('text-white');
                return; 
            }

            historyRow.classList.remove('d-none');
            targetBtn.classList.replace('btn-outline-info', 'btn-info');
            targetBtn.classList.add('text-white');

            const userHistory = await DB.getUserVisitHistory(email);

            if (userHistory.length === 0) {
                contentDiv.innerHTML = `<div class="text-center text-muted small py-3"><i class="bi bi-info-circle"></i> No visit history found for this user.</div>`;
                return;
            }

            let historyHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2 px-2">
                    <span class="fw-bold text-dark"><i class="bi bi-journal-text me-2"></i>Visit History</span>
                    <span class="badge bg-primary rounded-pill">Total Visits: ${userHistory.length}</span>
                </div>
                <table class="table table-sm table-bordered bg-white mb-0" style="font-size: 0.85rem;">
                    <thead class="table-light">
                        <tr>
                            <th>Date</th>
                            <th>Time In</th>
                            <th>Time Out</th>
                            <th>Services / Reasons</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            userHistory.forEach(visit => {
                const dateIn = visit.timeIn ? visit.timeIn.toDate().toLocaleDateString() : 'N/A';
                const timeIn = visit.timeIn ? visit.timeIn.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A';
                const timeOut = visit.timeOut ? visit.timeOut.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '<span class="text-success fw-bold">Active Now</span>';
                
                let services = "N/A";
                if (visit.reasons && Array.isArray(visit.reasons)) {
                    services = visit.reasons.join(', ');
                } else if (visit.reasons) {
                    services = visit.reasons;
                }

                historyHTML += `
                    <tr>
                        <td class="fw-medium">${dateIn}</td>
                        <td class="text-primary">${timeIn}</td>
                        <td class="text-secondary">${timeOut}</td>
                        <td>${services}</td>
                    </tr>
                `;
            });

            historyHTML += `</tbody></table>`;
            contentDiv.innerHTML = historyHTML;
        };
    });
}