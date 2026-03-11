import { DB } from '../../modules/database.js';
import { initOverview } from './adminOverview.js';
import { initUsers } from './adminUsers.js';
import { initReports } from './adminReports.js';

let currentActiveLogView = 'student'; 
let visitsListenerUnsubscribe = null;

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
        // Fetch static users data (doesn't need to be real-time)
        const initialUsersData = await DB.getUsersPaginated(50, null);
        initUsers(initialUsersData.users, initialUsersData.lastDoc);

        // REAL-TIME STREAM for Visits
        if (visitsListenerUnsubscribe) visitsListenerUnsubscribe();

        visitsListenerUnsubscribe = DB.listenToVisits((liveVisits) => {
            console.log("Real-time Update Received.");
            
            initOverview(liveVisits); 
            initReports(liveVisits); 
            
            startSmartClosingWatcher(liveVisits);
        });
        
    } catch (e) { 
        console.error("Admin Load Error:", e); 
        alert("Failed to load dashboard data. Please check your connection.");
    }
}

// SMART BACKGROUND TIMER (Schedule Aware!)
function startSmartClosingWatcher(visitsCache) {
    setInterval(async () => {
        const now = new Date();
        const day = now.getDay();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        let isClosingTime = false;
        
        // M/T/W/F: Trigger exact auto-close at 7:00 PM (19:00)
        if ((day === 1 || day === 2 || day === 3 || day === 5) && hour === 19 && minute === 0) {
            isClosingTime = true;
        }
        // TH/S: Trigger exact auto-close at 6:00 PM (18:00)
        else if ((day === 4 || day === 6) && hour === 18 && minute === 0) {
            isClosingTime = true;
        }

        // If the clock strikes closing time, sweep the database!
        if (isClosingTime) {
            const activeVisits = visitsCache.filter(v => v.status === 'active' || !v.timeOut);
            
            if (activeVisits.length > 0) {
                for (const visit of activeVisits) {
                    const checkInTime = visit.timeIn && typeof visit.timeIn.toDate === 'function' 
                        ? visit.timeIn.toDate() 
                        : new Date(visit.timeIn);
                    
                    const forcedOutTime = new Date(checkInTime);
                    forcedOutTime.setHours(hour, 0, 0, 0); // Sets to either 19:00 or 18:00 based on the current hour check

                    await DB.updateVisit(visit.id, {
                        timeOut: forcedOutTime,
                        status: 'completed',
                        autoClosed: true // Helpful flag so you know the system forced them out
                    });
                }
                location.reload(); 
            }
        }
    }, 60000); // Checks the clock once every 60 seconds
}