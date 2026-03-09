import { db } from '../config/firebase.js';
import { 
    doc, getDoc, setDoc, addDoc, collection, 
    serverTimestamp, query, orderBy, getDocs, where, limit, startAfter 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
            ...data // 
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
        return await setDoc(visitRef, {
            status: 'completed',
            timeOut: serverTimestamp()
        }, { merge: true });
    },

    // Updates a specific visit (Used for the 7:00 PM Auto-Close)
    async updateVisit(visitId, data) {
        const visitRef = doc(db, "visits", visitId);
        return await setDoc(visitRef, data, { merge: true });
    },

    //Handles the 7:00 PM Auto Checkout
    async forceCheckoutAllActive() {
        const q = query(collection(db, "visits"), where("status", "==", "active"));
        const activeDocs = await getDocs(q);
        const promises = [];
        activeDocs.forEach(docSnap => {
            const visitRef = doc(db, "visits", docSnap.id);
            promises.push(setDoc(visitRef, {
                status: 'completed',
                timeOut: serverTimestamp(),
                autoClosed: true // Marks that this was done by the admin, not the user
            }, { merge: true }));
        });
        return await Promise.all(promises);
    },

    // ADMIN METHODS

    async getRecentVisits(maxResults = 1000) {
        const q = query(collection(db, "visits"), orderBy("timeIn", "desc"), limit(maxResults));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Use only for CSV Exports. Will consume massive read quotas!
    async getAllVisitsForExport() {
        const q = query(collection(db, 'visits'), orderBy('timeIn', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Smart Filter & Search Query for Users with Pagination
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
                // \uf8ff acts like a wildcard for prefix matching
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