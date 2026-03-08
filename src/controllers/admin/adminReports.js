import { getCurrentLogView } from './adminController.js';

let currentVisits = [];
let isReportSetup = false;
let lastGeneratedReportData = [];

const activityMap = {
    "Reading": "Reading Books",
    "Research": "Thesis Work",
    "Studying": "Studying / Reviewing",
    "Borrowing": "Borrowing of Books",
    "Waiting": "Waiting / Between Classes"
};

export function initReports(visits) {
    currentVisits = visits;
    
    if (!isReportSetup) {
        setupReportFilters();
        isReportSetup = true;
    }
}

function setupReportFilters() {
    const specificDateIn = document.getElementById('report-date');
    const customRangeWrapper = document.getElementById('custom-range-inputs'); 
    const startDateIn = document.getElementById('report-start-date');
    const endDateIn = document.getElementById('report-end-date');
    const periodFilter = document.getElementById('report-period-filter');
    
    specificDateIn.valueAsDate = new Date();

    periodFilter.addEventListener('change', (e) => {
        const val = e.target.value;
        
        specificDateIn.classList.add('d-none');
        customRangeWrapper.classList.remove('d-flex');
        customRangeWrapper.classList.add('d-none');

        if (val === 'specific') {
            specificDateIn.classList.remove('d-none');
        } else if (val === 'custom') {
            customRangeWrapper.classList.remove('d-none');
            customRangeWrapper.classList.add('d-flex');
        }
    });

    document.getElementById('btn-generate-report').onclick = () => {
        const period = periodFilter.value;
        const sCol = document.getElementById('report-college').value;
        const activeRoleView = getCurrentLogView(); 
        
        let start = new Date();
        let end = new Date();

        if (period === 'specific') {
            const [y, m, d] = specificDateIn.value.split('-');
            start = new Date(y, m - 1, d); start.setHours(0,0,0,0);
            end = new Date(y, m - 1, d); end.setHours(23,59,59,999);
        } else if (period === 'today') {
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
        } else if (period === 'weekly') {
            start.setDate(new Date().getDate() - 7); start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
        } else if (period === 'monthly') {
            start.setMonth(new Date().getMonth() - 1); start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
        } else if (period === 'all') {
            start = new Date(2025, 7, 11); 
            end.setHours(23,59,59,999);
        } else if (period === 'custom') {
            if(!startDateIn.value || !endDateIn.value) return alert("Please select start and end dates.");
            const [sy, sm, sd] = startDateIn.value.split('-');
            start = new Date(sy, sm - 1, sd); start.setHours(0,0,0,0);
            const [ey, em, ed] = endDateIn.value.split('-');
            end = new Date(ey, em - 1, ed); end.setHours(23,59,59,999);
        }
        
        lastGeneratedReportData = currentVisits.filter(v => {
            const vType = v.userType || 'student';
            const matchType = vType === activeRoleView;
            const matchCol = sCol === 'ALL' || v.college === sCol || activeRoleView === 'staff';
            
            let matchDate = false;
            if (v.timeIn) {
                const vDate = v.timeIn.toDate();
                matchDate = vDate >= start && vDate <= end;
            }

            return matchType && matchDate && matchCol;
        });

        const tbody = document.getElementById('report-table-body');
        tbody.innerHTML = lastGeneratedReportData.length === 0 ? '<tr><td colspan="7" class="text-center py-5 fs-5 text-muted">No records found for the selected criteria.</td></tr>' : '';
        
        lastGeneratedReportData.forEach(v => {
            const tIn = v.timeIn ? v.timeIn.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
            const tOut = v.timeOut ? v.timeOut.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '<span class="text-success fw-bold">Active</span>';
            
            // Duration Logic
            let durationStr = '<span class="text-success fw-bold">—</span>';
            if (v.timeIn && v.timeOut) {
                const diffMs = v.timeOut.toDate() - v.timeIn.toDate();
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                durationStr = diffHrs > 0 ? `${diffHrs}h ${diffMins}m` : `${diffMins}m`;
            }

            const acts = v.reasons && v.reasons.length > 0 ? v.reasons.map(r => activityMap[r] || r).join('<br>') : 'N/A'; 
            const departmentPrint = activeRoleView === 'staff' ? 'N/A' : v.college; 
            
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold text-dark px-3">${v.name || 'N/A'}</td>
                    <td class="px-3">${v.email}</td>
                    <td class="px-3"><span class="badge bg-light text-dark border">${departmentPrint}</span></td>
                    <td class="small text-muted px-3 lh-sm">${acts}</td>
                    <td class="fw-medium px-3">${tIn}</td>
                    <td class="fw-medium px-3">${tOut}</td>
                    <td class="fw-bold text-dark px-3 text-center bg-light">${durationStr}</td>
                </tr>`;
        });
        
        const colText = activeRoleView === 'staff' ? 'N/A' : (sCol === 'ALL' ? 'ALL DEPARTMENTS' : sCol);
        const formatOpts = { year: 'numeric', month: 'short', day: 'numeric' };
        let dateText = (period === 'specific' || period === 'today') 
            ? start.toLocaleDateString('en-US', formatOpts).toUpperCase() 
            : `${start.toLocaleDateString('en-US', formatOpts)} — ${end.toLocaleDateString('en-US', formatOpts)}`.toUpperCase();

        document.getElementById('report-meta-role').innerText = activeRoleView.toUpperCase();
        document.getElementById('report-meta-dept').innerText = colText;
        document.getElementById('report-meta-date').innerText = dateText;
        document.getElementById('report-total-count').innerText = lastGeneratedReportData.length;
        
        const currentTimestamp = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
        document.getElementById('report-generation-time').innerText = `Generated on ${currentTimestamp}`;

        document.getElementById('pdf-content-area').classList.remove('d-none');
        document.getElementById('btn-export-pdf').classList.remove('d-none');
        document.getElementById('btn-export-csv').classList.remove('d-none');
    };

    // Export to PDF
    document.getElementById('btn-export-pdf').onclick = () => {
        const activeRoleView = getCurrentLogView();
        html2pdf().set({ 
            margin: [0.5, 0.5, 0.5, 0.5], 
            filename: `NEU-Library-${activeRoleView.toUpperCase()}-Logs.pdf`, 
            html2canvas: { scale: 2, useCORS: true }, 
            jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' } 
        }).from(document.getElementById('pdf-content-area')).save();
    };

    // Export to CSV
    document.getElementById('btn-export-csv').onclick = () => {
        const activeRoleView = getCurrentLogView();
        let csvContent = "Name,Email,College/Dept,Activities,Time In,Time Out,Duration\n";

        lastGeneratedReportData.forEach(v => {
            const name = `"${(v.name || 'N/A').replace(/"/g, '""')}"`;
            const email = `"${v.email.replace(/"/g, '""')}"`;
            const college = `"${(v.college || 'N/A').replace(/"/g, '""')}"`;
            const actsRaw = v.reasons && v.reasons.length > 0 ? v.reasons.map(r => activityMap[r] || r).join(', ') : 'N/A';
            const acts = `"${actsRaw.replace(/"/g, '""')}"`;
            const timeIn = `"${v.timeIn ? v.timeIn.toDate().toLocaleString() : ''}"`;
            const timeOut = `"${v.timeOut ? v.timeOut.toDate().toLocaleString() : 'Active'}"`;
            
            let duration = 'Ongoing';
            if (v.timeOut && v.timeIn) {
                const diffMs = v.timeOut.toDate() - v.timeIn.toDate();
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                duration = diffHrs > 0 ? `${diffHrs}h ${diffMins}m` : `${diffMins}m`;
            }
            const dur = `"${duration}"`;

            csvContent += `${name},${email},${college},${acts},${timeIn},${timeOut},${dur}\n`;
        });

        // Use a Blob to enforce UTF-8 encoding so Excel reads it perfectly
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `NEU-Library-${activeRoleView.toUpperCase()}-Logs.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
}