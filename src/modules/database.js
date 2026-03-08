import { db } from '../config/firebase.js';
import { 
    doc, getDoc, setDoc, addDoc, collection, 
    serverTimestamp, query, orderBy, getDocs, where 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const DB = {
    async getUser(uid) {
        const snap = await getDoc(doc(db, "users", uid));
        return snap.exists() ? snap.data() : null;
    },

    async createUser(uid, data) {
        return await setDoc(doc(db, "users", uid), {
            ...data,
            isBlocked: false,
            role: 'user',
            createdAt: serverTimestamp()
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

    //ADMIN METHODS

    async getAllVisits() {
        const q = query(collection(db, "visits"), orderBy("timeIn", "desc"));
        return await getDocs(q);
    },

    async getAllUsers() {
        const q = query(collection(db, "users"));
        return await getDocs(q);
    },

    async toggleBlockStatus(uid, newStatus) {
        const userRef = doc(db, "users", uid);
        return await setDoc(userRef, { isBlocked: newStatus }, { merge: true });
    }
};