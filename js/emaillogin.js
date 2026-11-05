import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const form = document.getElementById("signupForm");
const emailInput = document.getElementById("authEmail");
const passwordInput = document.getElementById("authPassword");
const authBtn = document.getElementById("authBtn");
const authBtnText = document.getElementById("authBtnText");
const message = document.getElementById("authMessage");
const switchBtn = document.getElementById("switchBtn");
const switchText = document.getElementById("switchText");
const forgotRow = document.getElementById("forgotRow");
const forgotBtn = document.getElementById("forgotBtn");
const modeKicker = document.getElementById("modeKicker");
const modeTitle = document.getElementById("modeTitle");

let mode = "signup";

function setMode(m) {
  mode = m;
  message.textContent = "";
  if (m === "signup") {
    modeKicker.textContent = "NEW HERE";
    modeTitle.textContent = "Sign up with email";
    authBtnText.textContent = "Sign up";
    switchText.textContent = "Already have an account?";
    switchBtn.textContent = "Log in";
    forgotRow.hidden = true;
  } else {
    modeKicker.textContent = "WELCOME BACK";
    modeTitle.textContent = "Log in with email";
    authBtnText.textContent = "Log in";
    switchText.textContent = "New here?";
    switchBtn.textContent = "Sign up";
    forgotRow.hidden = false;
  }
}
setMode("signup");
switchBtn.addEventListener("click", () => setMode(mode === "signup" ? "login" : "signup"));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  authBtn.disabled = true;
  message.textContent = "Step 1: contacting Firebase...";

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (mode === "signup") {
      await createUserWithEmailAndPassword(auth, email, password);
      message.textContent = "Step 2: account created. Opening profile form...";
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      message.textContent = "Step 2: logged in. Opening...";
    }
        const cred = auth.currentUser;
    const snap = await getDoc(doc(db, "users", cred.uid));
    window.location.href = snap.exists() ? "listing.html" : "signup.html";
  } catch (err) {
    console.error(err);
    authBtn.disabled = false;
    message.textContent = "FAILED: " + (err.code || err.message);
  }
});

forgotBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) { message.textContent = "Enter your email above first."; return; }
  try {
    await sendPasswordResetEmail(auth, email);
    message.textContent = "Password reset email sent.";
  } catch (err) {
    message.textContent = "FAILED: " + (err.code || err.message);
  }
});