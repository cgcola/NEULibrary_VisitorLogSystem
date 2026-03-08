import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. YOUR FIREBASE CONFIG (Copy from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBirK2ffc7QbuxwPs6qnerV2jdQlqVaovw",
  authDomain: "neu-library-system-52872.firebaseapp.com",
  projectId: "neu-library-system-52872",
  storageBucket: "neu-library-system-52872.firebasestorage.app",
  messagingSenderId: "528494418690",
  appId: "1:528494418690:web:31e9f8f1b20884b338c01b",
  measurementId: "G-DL5RCM3JTC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// EXPORT these so other files can see them
export const auth = getAuth(app);
export const db = getFirestore(app); // <--- ENSURE 'export' IS HERE
export const provider = new GoogleAuthProvider();

provider.setCustomParameters({ hd: "neu.edu.ph" });