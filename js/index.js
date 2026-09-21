import { login, logout, watchUser } from "./auth.js";

const signedOut = document.getElementById("signedOut");
const signedIn = document.getElementById("signedIn");
const welcome = document.getElementById("welcome");
const loginBtn = document.getElementById("loginBtn");
const continueBtn = document.getElementById("continueBtn");
const logoutBtn = document.getElementById("logoutBtn");
const msg = document.getElementById("loginMessage");

// decide what to show once Firebase knows if someone is signed in
watchUser((user) => {
  if (user) {
    welcome.textContent = "Signed in as " + user.displayName;
    signedIn.style.display = "block";
    signedOut.style.display = "none";
  } else {
    signedIn.style.display = "none";
    signedOut.style.display = "block";
  }
});

loginBtn.addEventListener("click", async () => {
  loginBtn.disabled = true;
  msg.textContent = "Opening Google sign-in...";
  try {
    await login();   // also creates the profile on first sign-in
    window.location.href = "listing.html";
  } catch (err) {
    console.error(err);
    loginBtn.disabled = false;
    if (err.code === "auth/popup-closed-by-user") {
      msg.textContent = "Sign-in was cancelled. Please try again.";
    } else if (err.code === "auth/popup-blocked") {
      msg.textContent = "Your browser blocked the popup. Allow popups for this site and try again.";
    } else if (err.code === "auth/unauthorized-domain") {
      msg.textContent = "This address is not allowed in Firebase. Add it under Authentication → Settings → Authorized domains.";
    } else {
      msg.textContent = "Sign-in failed (" + (err.code || err.message) + ").";
    }
  }
});

continueBtn.addEventListener("click", () => {
  window.location.href = "listing.html";
});

logoutBtn.addEventListener("click", () => logout());