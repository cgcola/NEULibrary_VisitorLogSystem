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
        // Fetch the safe, limited chunks of data
        const recentVisitsCache = await DB.getRecentVisits(1000);
        const initialUsersData = await DB.getUsersPaginated(50, null);

        // Start the invisible 7:00 PM background watcher
        startSmartClosingWatcher(recentVisitsCache);

        // Distribute the safe data to the child modules
        initOverview(recentVisitsCache); 
        initUsers(initialUsersData.users, initialUsersData.lastDoc); // Pass users AND bookmark
        initReports(recentVisitsCache); 
        
    } catch (e) { 
        console.error("Admin Load Error:", e); 
        alert("Failed to load dashboard data. Please check your connection.");
    }
}

// SMART 7:00 PM BACKGROUND TIMER
function startSmartClosingWatcher(visitsCache) {
    setInterval(async () => {
        const now = new Date();
        
        // If the current time is exactly 19:00 (7:00 PM)
        if (now.getHours() === 19 && now.getMinutes() === 0) {
            
            const activeVisits = visitsCache.filter(v => v.status === 'active' || !v.timeOut);
            
            if (activeVisits.length > 0) {
                for (const visit of activeVisits) {
                    const checkInTime = visit.timeIn && typeof visit.timeIn.toDate === 'function' 
                        ? visit.timeIn.toDate() 
                        : new Date(visit.timeIn);
                    
                    const forcedOutTime = new Date(checkInTime);
                    forcedOutTime.setHours(19, 0, 0, 0); 

                    await DB.updateVisit(visit.id, {
                        timeOut: forcedOutTime,
                        status: 'completed' 
                    });
                }
                location.reload(); 
            }
        }
    }, 60000);
}