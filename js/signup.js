import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("signupForm");
const btn = document.getElementById("signupBtn");
const msg = document.getElementById("signupMessage");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;

  // already has a profile? this page isn't needed
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    window.location.href = "listing.html";
    return;
  }

  document.getElementById("fullName").value = user.displayName || "";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  btn.disabled = true;
  msg.textContent = "Saving...";

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      name: document.getElementById("fullName").value.trim(),
      rollNo: document.getElementById("rollNo").value.trim(),
      department: document.getElementById("department").value,
      year: document.getElementById("year").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      email: currentUser.email,
      photoURL: currentUser.photoURL || "",
      createdAt: serverTimestamp()
    });

    window.location.href = "listing.html";
  } catch (err) {
    console.error(err);
    msg.textContent = "Something went wrong. Please try again.";
    btn.disabled = false;
  }
});