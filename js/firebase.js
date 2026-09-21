import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
const firebaseConfig = {
    apiKey: "AIzaSyBRmgENuyTb1rs8pyWgqlaa_LZJa8hmp20",
    authDomain: "lostandfound-7c8f6.firebaseapp.com",
    projectId: "lostandfound-7c8f6",
    storageBucket: "lostandfound-7c8f6.firebasestorage.app",
    messagingSenderId: "169098876136",
    appId: "1:169098876136:web:9d7856a21e0267aac4e55d",
    measurementId: "G-DG0PZZKG98"
  };
  const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
export const auth = getAuth(app);