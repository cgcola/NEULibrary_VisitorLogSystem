import { DB } from '../../modules/database.js';
import { initOverview } from './adminOverview.js';
import { initUsers } from './adminUsers.js';
import { initReports } from './adminReports.js';

let currentActiveLogView = 'student'; 

export function initAdmin() {
    setupNavLinks();
}

// Export this getter so the reports module knows which tab is currently active
export function getCurrentLogView() {
    return currentActiveLogView;
}

function setupNavLinks() {
    const navLinks = {
        'nav-dashboard': { section: 'section-dashboard', title: 'Library Statistics', breadcrumb: 'Overview' },
        'nav-student-logs': { section: 'section-logs', title: 'Student Logs Data', breadcrumb: 'Logs / Students', viewType: 'student' },
        'nav-faculty-logs': { section: 'section-logs', title: 'Faculty Logs Data', breadcrumb: 'Logs / Faculty', viewType: 'faculty' },
        'nav-staff-logs': { section: 'section-logs', title: 'Staff Logs Data', breadcrumb: 'Logs / Staff', viewType: 'staff' },
        'nav-users': { section: 'section-users', title: 'Manage System Users', breadcrumb: 'Directory' }
    };

    document.querySelectorAll('#admin-sidebar-nav .nav-link').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('#admin-sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
            btn.classList.add('active'); 
            document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('d-none'));
            
            const config = navLinks[btn.id];
            document.getElementById(config.section).classList.remove('d-none');
            document.getElementById('current-page-title').innerText = config.title;
            document.getElementById('current-page-title-breadcrumb').innerText = config.breadcrumb;
            
            const topFilters = document.getElementById('dashboard-date-filters');
            if (btn.id === 'nav-dashboard') {
                topFilters.classList.remove('d-none');
                topFilters.classList.add('d-flex');
            } else {
                topFilters.classList.remove('d-flex');
                topFilters.classList.add('d-none');
            }
            
            if (config.viewType) {
                currentActiveLogView = config.viewType;
                document.getElementById('report-meta-info').innerText = `Role Context: ${currentActiveLogView.toUpperCase()}`;
                document.getElementById('pdf-content-area').classList.add('d-none');
                document.getElementById('btn-export-pdf').classList.add('d-none');
                
                const collegeContainer = document.getElementById('report-college-container');
                if(currentActiveLogView === 'staff') {
                    collegeContainer.classList.add('d-none');
                } else {
                    collegeContainer.classList.remove('d-none');
                }
            }
        };
    });
}

export async function loadAdminDashboard() {
    try {
        const allVisitsSnap = await DB.getAllVisits();
        const allUsersSnap = await DB.getAllUsers();
        
        const allVisitsCache = [];
        allVisitsSnap.forEach(doc => allVisitsCache.push({ id: doc.id, ...doc.data() }));
        
        const allUsersCache = []; 
        allUsersSnap.forEach(doc => allUsersCache.push({ id: doc.id, ...doc.data() }));

        // Distribute the data to the child modules
        initOverview(allVisitsCache); 
        initUsers(allUsersCache);
        initReports(allVisitsCache); 
    } catch (e) { 
        console.error("Admin Load Error:", e); 
    }
}