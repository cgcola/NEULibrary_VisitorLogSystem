import { db } from '../config/firebase.js';
import { 
    doc, getDoc, setDoc, addDoc, collection, 
    serverTimestamp, query, orderBy, getDocs, where, limit, startAfter, onSnapshot
} from 'firebase/firestore';


export const DB = {
    async getUser(uid) {
        const snap = await getDoc(doc(db, "users", uid));
        return snap.exists() ? snap.data() : null;
    },

    async createUser(uid, data) {
        return await setDoc(doc(db, "users", uid), {
            isBlocked: false,
            role: 'user', 
            createdAt: serverTimestamp(),
            ...data 
        });
    },

    async getAdminWhitelist() {
        try {
            const snap = await getDoc(doc(db, "system_settings", "admin_config"));
            if (snap.exists() && snap.data().whitelisted_emails) {
                return snap.data().whitelisted_emails.map(email => email.toLowerCase());
            }
            return [];
        } catch (error) {
            console.error("Failed to load admin whitelist:", error);
            return [];
        }
    },

    // 🚀 NEW: Fetch history for a specific user and sort locally to avoid index errors
    async getUserVisitHistory(email) {
        try {
            const q = query(collection(db, "visits"), where("email", "==", email));
            const snap = await getDocs(q);
            
            let visits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            visits.sort((a, b) => {
                const timeA = a.timeIn ? a.timeIn.toMillis() : 0;
                const timeB = b.timeIn ? b.timeIn.toMillis() : 0;
                return timeB - timeA;
            });

            return visits;
        } catch (error) {
            console.error("Error fetching user history:", error);
            return [];
        }
    },

    // REAL-TIME LISTENER for Admin Dashboard
    listenToVisits(callback) {
        const q = query(collection(db, "visits"), orderBy("timeIn", "desc"), limit(1000));
        return onSnapshot(q, (snapshot) => {
            const visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(visits);
        }, (error) => {
            console.error("Live Stream Error:", error);
        });
    },

    async logVisit(visitData) {
        return await addDoc(collection(db, "visits"), {
            ...visitData,
            status: 'active',
            timeIn: serverTimestamp(),
            timeOut: null
        });
    },

    async getActiveVisits() {
        const q = query(collection(db, "visits"), where("status", "==", "active"));
        return await getDocs(q);
    },

    async checkoutVisit(visitId) {
        const visitRef = doc(db, "visits", visitId);
        
        const now = new Date();
        let finalTimeOut = serverTimestamp(); // Default to exact current time

        // If they sign out at 7:00 PM (19:00) or later...
        if (now.getHours() >= 19) {
            // Force the time stamp to be exactly 7:00 PM of today
            const cappedTime = new Date();
            cappedTime.setHours(19, 0, 0, 0);
            finalTimeOut = cappedTime;
        }

        return await setDoc(visitRef, {
            status: 'completed',
            timeOut: finalTimeOut // Uses the exact time, OR the 7PM capped time
        }, { merge: true });
    },

    async updateVisit(visitId, data) {
        const visitRef = doc(db, "visits", visitId);
        return await setDoc(visitRef, data, { merge: true });
    },

    async forceCheckoutAllActive() {
        const q = query(collection(db, "visits"), where("status", "==", "active"));
        const activeDocs = await getDocs(q);
        const promises = [];
        activeDocs.forEach(docSnap => {
            const visitRef = doc(db, "visits", docSnap.id);
            promises.push(setDoc(visitRef, {
                status: 'completed',
                timeOut: serverTimestamp(),
                autoClosed: true 
            }, { merge: true }));
        });
        return await Promise.all(promises);
    },

    async getRecentVisits(maxResults = 1000) {
        const q = query(collection(db, "visits"), orderBy("timeIn", "desc"), limit(maxResults));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getAllVisitsForExport() {
        const q = query(collection(db, 'visits'), orderBy('timeIn', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getUsersPaginated(maxResults = 50, lastDoc = null, filters = {}) {
        try {
            let conditions = [];

            if (filters.role && filters.role !== 'all') {
                conditions.push(where('userType', '==', filters.role));
            }
            if (filters.college && filters.college !== 'all') {
                conditions.push(where('collegeOrOffice', '==', filters.college));
            }
            if (filters.search) {
                conditions.push(where('name', '>=', filters.search));
                conditions.push(where('name', '<=', filters.search + '\uf8ff'));
            }

            let q;
            if (lastDoc) {
                q = query(collection(db, 'users'), ...conditions, orderBy('name'), startAfter(lastDoc), limit(maxResults));
            } else {
                q = query(collection(db, 'users'), ...conditions, orderBy('name'), limit(maxResults));
            }
            
            const snap = await getDocs(q);
            const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const newLastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
            
            return { users: users, lastDoc: newLastDoc };
        } catch (error) {
            console.error("User Query Error:", error);
            return { users: [], lastDoc: null };
        }
    },

    async toggleBlockStatus(uid, newStatus) {
        const userRef = doc(db, "users", uid);
        return await setDoc(userRef, { isBlocked: newStatus }, { merge: true });
    }
};