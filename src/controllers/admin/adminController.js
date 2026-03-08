import { DB } from '../../modules/database.js';
import { initOverview } from './adminOverview.js';
import { initUsers } from './adminUsers.js';
import { initReports } from './adminReports.js';

let currentActiveLogView = 'student'; 

export function initAdmin() {
    setupNavLinks();
}

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
                document.getElementById('report-meta-role').innerText = currentActiveLogView.toUpperCase();
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

        // Start the invisible 7:00 PM background watcher
        startSmartClosingWatcher(allVisitsCache);

        // Distribute the data to the child modules
        initOverview(allVisitsCache); 
        initUsers(allUsersCache);
        initReports(allVisitsCache); 
    } catch (e) { 
        console.error("Admin Load Error:", e); 
    }
}

// SMART 7:00 PM BACKGROUND TIMER
function startSmartClosingWatcher(visitsCache) {
    // Check the clock every 1 minute (60000 ms)
    setInterval(async () => {
        const now = new Date();
        
        // If the current time is exactly 19:00 (7:00 PM)
        if (now.getHours() === 19 && now.getMinutes() === 0) {
            
            // Find anyone who hasn't logged out
            const activeVisits = visitsCache.filter(v => !v.timeOut);
            
            if (activeVisits.length > 0) {
                for (const visit of activeVisits) {
                    const checkInTime = new Date(visit.timeIn);
                    
                    // Stamp them out at exactly 7:00 PM on their check-in day
                    const forcedOutTime = new Date(checkInTime);
                    forcedOutTime.setHours(19, 0, 0, 0); 

                    // Ensure your DB module handles the update logic correctly
                    await DB.updateVisit(visit.id, {
                        timeOut: forcedOutTime.toISOString(),
                        status: 'completed' 
                    });
                }
                
                // Refresh the dashboard so the librarian sees it instantly drop to 0
                location.reload(); 
            }
        }
    }, 60000); 
}