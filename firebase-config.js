import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBP1itoU4XAOoBPEH-BvfqbnkAFYX5nX0s",
  authDomain: "mythos-3fbb6.firebaseapp.com",
  projectId: "mythos-3fbb6",
  storageBucket: "mythos-3fbb6.firebasestorage.app",
  messagingSenderId: "450751645310",
  appId: "1:450751645310:web:f39a9eda324538877afa2f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
