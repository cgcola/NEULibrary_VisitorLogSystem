# NEU Library Visitor Log System

A modern, paperless, and real-time visitor management system designed for the New Era University (NEU) Library. This full-stack web application replaces traditional handwritten logbooks with a streamlined digital kiosk experience, featuring Google Workspace authentication, automated time-tracking, and a powerful administrative analytics dashboard.

**Live Demo / Public Link:** [https://neu-library-visitor-log-system.vercel.app/](https://neu-library-visitor-log-system.vercel.app/)

---

## Key Features

### For Visitors (Entrance & Exit Terminals)
* **Institutional Login:** Secure, one-click sign-in using Google Authentication (optimized for `@neu.edu.ph` institutional accounts).
* **Smart Onboarding:** First-time users register their Name, Role (Student, Faculty, Staff), and College/Department. The database securely remembers them for all future visits.
* **Activity Tracking:** Visitors select their primary reasons for visiting (e.g., Thesis Work, PC Use, Borrowing of Books, Studying / Reviewing) before entry.
* **Frictionless Sign-Out:** A dedicated Exit Terminal allows visitors to quickly find their name via a real-time search bar and sign out with a single click.

### For Librarians (Admin Portal)
* **Real-Time Dashboard:** Monitor active users in the library, total daily visitors, and top-performing colleges at a glance.
* **Data Visualization:** Built-in analytics using Chart.js to display hourly visitor traffic trends, college demographics, and the most popular library resources.
* **Advanced Report Generation:** Filter historical logs by date (Specific Day, Weekly, Monthly, Custom Range), Role, and Department.
* **Official Data Export:** Instantly export filtered logs (including total duration spent) as a highly structured, printable **PDF Document** (For Official Use Only) or as a **CSV file** for Excel processing.
* **End-of-Day Auto-Close:** A 1-click "Auto-Close (7PM)" button allows librarians to automatically sign out any students who forgot to log out at closing time.
* **Kiosk Mode Ready:** Hidden "Change Terminal" gear icons allow administrators to easily switch a physical device between Entrance, Exit, and Admin modes without editing code.

---

## Why This System? 
* **Eliminates Paper Waste:** Completely digitizes the daily logging process.
* **Data-Driven Decisions:** The automatic activity and demographic charts allow library administration to justify budget requests and operational changes (e.g., seeing a high percentage of "PC Use" indicates a need for more computers).
* **High Security & Accuracy:** Built on Firebase Firestore with strict security rules, ensuring logs cannot be tampered with, deleted, or falsified by users.
* **Lightning Fast:** Built with Vanilla JavaScript and lightweight modules, ensuring it runs smoothly even on older library computers or tablets.

---

## 💻 Tech Stack

* **Frontend:** HTML5, CSS3, Bootstrap 5.3 (UI framework), Vanilla JavaScript (ES6 Modules).
* **Backend / Database:** Firebase Authentication, Cloud Firestore (NoSQL real-time database).
* **Libraries:** * `Chart.js` (Data visualization)
  * `html2pdf.js` (Client-side PDF generation)
* **Deployment:** Vercel (Hosting), GitHub (Version Control).

---

## 🛠️ How to Run Locally

If you want to download this code and run it on your own machine for testing or further development:

### 1. Clone the Repository
```bash
git clone [https://github.com/cgcola/NEULibrary_VisitorLogSystem.git](https://github.com/cgcola/NEULibrary_VisitorLogSystem.git)
cd NEULibrary_VisitorLogSystem
```

### 2. Setup Firebase
1. Create a free project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Google Sign-In provider).
3. Enable **Firestore Database**.
4. Register a Web App in your Firebase settings and copy the configuration keys.
5. Create a file named `firebase.js` inside the `src/config/` directory and paste your config:
```javascript
import { initializeApp } from "[https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js](https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js)";
import { getAuth } from "[https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js](https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js)";
import { getFirestore } from "[https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js](https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js)";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 3. Run a Local Server
Because this project uses ES6 Modules (`import`/`export`), it cannot be opened directly via the file system (`file://`). You must use a local server.
* **VS Code:** Install the **Live Server** extension, right-click `index.html`, and select "Open with Live Server".
* **Node.js:** Run `npx serve` in the project root.

### 4. Setup the First Admin Account
By default, all new logins are standard "users". To access the Admin Portal:
1. Log into the Entrance Terminal to create your account in the database.
2. Go to your Firebase Console > Firestore > `users` collection.
3. Find your document and change the `role` field from `"user"` to `"admin"`.

---

## Security Notes
Before deploying to production, ensure that your Google Cloud API Key restricts HTTP Referrers strictly to your deployment URL (e.g., `https://neu-library-visitor-log-system.vercel.app/*`). Furthermore, the Firestore Database rules are tightly scoped to prevent unauthorized deletions or data leaks.

---

**Developed by Carl Geneson Ola** *Designed and Developed for New Era University.*
