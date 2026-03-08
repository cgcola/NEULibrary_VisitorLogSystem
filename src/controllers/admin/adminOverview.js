import { DB } from '../../modules/database.js';
import { loadAdminDashboard } from './adminController.js';

let collegeChartInstance = null; 
let trendChartInstance = null;
let activityChartInstance = null;
let currentVisits = [];
let isFilterSetup = false;

// Dictionary for standardizing chart labels
const activityMap = {
    "Reading": "Reading Books",
    "Research": "Thesis Work",
    "Studying": "Studying / Reviewing",
    "Borrowing": "Borrowing of Books",
    "Waiting": "Waiting / Between Classes"
};

export function initOverview(visits) {
    currentVisits = visits;
    
    if (!isFilterSetup) {
        setupDashboardFilters();
        isFilterSetup = true;
    }

    // Force Auto-Close Hook
    const btnForceClose = document.getElementById('btn-force-close');
    if (btnForceClose) {
        btnForceClose.onclick = async () => {
            if(confirm("Are you sure you want to force sign out all active users? This is usually done at 7:00 PM closing.")) {
                btnForceClose.disabled = true;
                btnForceClose.innerText = "Closing...";
                await DB.forceCheckoutAllActive();
                loadAdminDashboard(); // Refresh all data cleanly
            }
        }
    }

    const periodFilter = document.getElementById('dashboard-period-filter');
    const val = periodFilter ? periodFilter.value : 'today';
    
    if (val === 'custom') {
        const startDate = document.getElementById('dashboard-start-date');
        const endDate = document.getElementById('dashboard-end-date');
        if (startDate && endDate && startDate.value && endDate.value) {
            renderOverview('custom', startDate.value, endDate.value);
        } else {
            renderOverview('today');
        }
    } else {
        renderOverview(val);
    }
}

function setupDashboardFilters() {
    const periodFilter = document.getElementById('dashboard-period-filter');
    const customWrapper = document.getElementById('dashboard-custom-range'); 
    const startDate = document.getElementById('dashboard-start-date');
    const endDate = document.getElementById('dashboard-end-date');

    if (!periodFilter) return; 

    periodFilter.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            if(customWrapper) {
                customWrapper.classList.remove('d-none');
                customWrapper.classList.add('d-flex');
            }
        } else {
            if(customWrapper) {
                customWrapper.classList.add('d-none');
                customWrapper.classList.remove('d-flex');
            }
            renderOverview(val);
        }
    });

    const applyCustom = () => {
        if (periodFilter.value === 'custom' && startDate.value && endDate.value) {
            renderOverview('custom', startDate.value, endDate.value);
        }
    };

    if(startDate) startDate.addEventListener('change', applyCustom);
    if(endDate) endDate.addEventListener('change', applyCustom);
}

function renderOverview(period = 'today', customStart = null, customEnd = null) {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'today') {
        start.setHours(0,0,0,0);
    } else if (period === 'weekly') {
        start.setDate(now.getDate() - 7);
        start.setHours(0,0,0,0);
    } else if (period === 'monthly') {
        start.setMonth(now.getMonth() - 1);
        start.setHours(0,0,0,0);
    } else if (period === 'all') {
        start = new Date(2025, 7, 11);
    } else if (period === 'custom') {
        start = new Date(customStart);
        start.setHours(0,0,0,0);
        end = new Date(customEnd);
        end.setHours(23,59,59,999);
    }

    const filteredVisits = currentVisits.filter(v => {
        if (!v.timeIn) return false;
        const vDate = v.timeIn.toDate();
        if (period === 'custom') {
            return vDate >= start && vDate <= end;
        }
        return vDate >= start;
    });

    document.getElementById('stat-active').innerText = filteredVisits.filter(v => v.status === 'active').length;
    document.getElementById('stat-total-today').innerText = filteredVisits.length;

    const collegeCounts = {};
    const activityCounts = {}; // New Activity Tracker
    const hourlyCounts = { '8AM':0, '10AM':0, '12PM':0, '2PM':0, '4PM':0, '6PM':0 };

    filteredVisits.forEach(v => {
        const col = v.college || 'Unknown';
        collegeCounts[col] = (collegeCounts[col] || 0) + 1;
        
        // Map activities to chart
        if (v.reasons && Array.isArray(v.reasons)) {
            v.reasons.forEach(r => {
                const actName = activityMap[r] || r;
                activityCounts[actName] = (activityCounts[actName] || 0) + 1;
            });
        }

        const hour = v.timeIn.toDate().getHours();
        if(hour <= 9) hourlyCounts['8AM']++;
        else if(hour <= 11) hourlyCounts['10AM']++;
        else if(hour <= 13) hourlyCounts['12PM']++;
        else if(hour <= 15) hourlyCounts['2PM']++;
        else if(hour <= 17) hourlyCounts['4PM']++;
        else hourlyCounts['6PM']++;
    });

    let topCollege = "-"; let max = 0;
    for (const [col, count] of Object.entries(collegeCounts)) { if (count > max) { max = count; topCollege = col; } }
    document.getElementById('stat-top-college').innerText = topCollege;

    Chart.defaults.color = '#6c757d'; 
    Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";

    // Render College Doughnut Chart
    const ctxCol = document.getElementById('collegeChart').getContext('2d');
    if (collegeChartInstance) collegeChartInstance.destroy(); 
    collegeChartInstance = new Chart(ctxCol, {
        type: 'doughnut',
        data: { labels: Object.keys(collegeCounts), datasets: [{ data: Object.values(collegeCounts), backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom' } } }
    });

    // Render New Activities Chart (Pie)
    const ctxAct = document.getElementById('activitiesChart').getContext('2d');
    if (activityChartInstance) activityChartInstance.destroy(); 
    activityChartInstance = new Chart(ctxAct, {
        type: 'pie',
        data: { labels: Object.keys(activityCounts), datasets: [{ data: Object.values(activityCounts), backgroundColor: ['#6f42c1', '#fd7e14', '#20c997', '#0dcaf0', '#d63384', '#0d6efd', '#ffc107'], borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });

    // Render Trend Line Chart
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    if (trendChartInstance) trendChartInstance.destroy();
    trendChartInstance = new Chart(ctxTrend, {
        type: 'line',
        data: { labels: Object.keys(hourlyCounts), datasets: [{ label: 'Check-ins', data: Object.values(hourlyCounts), borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.1)', fill: true, tension: 0.4, borderWidth: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#e9ecef' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
    });

    const recentTable = document.getElementById('recent-logs-table');
    recentTable.innerHTML = '';
    filteredVisits.slice(0, 8).forEach(v => {
        const time = v.timeIn ? v.timeIn.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
        const role = v.userType ? v.userType.toUpperCase() : 'STUDENT';
        recentTable.innerHTML += `<tr><td class="fw-bold text-dark">${v.name || v.email}</td><td><span class="badge bg-secondary">${role}</span></td><td>${v.college}</td><td class="text-primary fw-medium">${time}</td></tr>`;
    });
}