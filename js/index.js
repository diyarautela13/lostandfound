import { login, logout, watchUser, isNewUser } from "./auth.js";

const signedOut = document.getElementById("signedOut");
const signedIn = document.getElementById("signedIn");
const welcome = document.getElementById("welcome");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const continueBtn = document.getElementById("continueBtn");
const logoutBtn = document.getElementById("logoutBtn");
const msg = document.getElementById("loginMessage");

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

async function handleAuthClick(intendedNewUser) {
  signupBtn.disabled = true;
  loginBtn.disabled = true;
  msg.textContent = "Opening Google sign-in...";

  try {
    const user = await login();
    const freshAccount = await isNewUser(user);

    if (freshAccount) {
      window.location.href = "signup.html";
    } else if (intendedNewUser) {
      msg.textContent = "This Gmail already has a profile. Signing you in instead.";
      window.location.href = "listing.html";
    } else {
      window.location.href = "listing.html";
    }
  } catch (err) {
    console.error(err);
    signupBtn.disabled = false;
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
}

signupBtn.addEventListener("click", () => handleAuthClick(true));
loginBtn.addEventListener("click", () => handleAuthClick(false));

continueBtn.addEventListener("click", () => {
  window.location.href = "listing.html";
});

logoutBtn.addEventListener("click", () => logout());