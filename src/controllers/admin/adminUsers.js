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

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-dark">${u.name || 'N/A'}</td>
            <td>${u.email}</td>
            <td><span class="badge bg-secondary">${roleStr}</span></td>
            <td>${u.collegeOrOffice || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td class="text-end">
                <button class="btn btn-sm ${btnClass} px-3 fw-bold btn-toggle-block" data-uid="${u.id}" data-blocked="${isBlocked}">${btnText}</button>
            </td>`;
        list.appendChild(tr);
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
                
                // Refresh the specific search to update the UI
                triggerNewDatabaseSearch(); 
            }
        };
    });
}