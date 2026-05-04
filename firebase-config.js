import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBP1itoU4XAOoBPEH-BvfqbnkAFYX5nX0s",
  authDomain: "mythos-3fbb6.firebaseapp.com",
  projectId: "mythos-3fbb6",
  storageBucket: "mythos-3fbb6.firebasestorage.app",
  messagingSenderId: "450751645310",
  appId: "1:450751645310:web:f39a9eda324538877afa2f"
};

const app      = initializeApp(firebaseConfig);
export const db       = getFirestore(app);
export const auth     = getAuth(app);
export const provider = new GoogleAuthProvider();

export function loginWithGoogle() {
  return signInWithPopup(auth, provider);
}

export function logOut() {
  return signOut(auth);
}

export function onAuthReady(callback) {
  onAuthStateChanged(auth, callback);
}
