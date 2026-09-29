import { auth, db } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const provider = new GoogleAuthProvider();


// =========================================================
// LOGIN
// =========================================================

// Opens the Google popup.
// Does NOT create a profile.
export async function login() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}


// =========================================================
// LOGOUT
// =========================================================

export async function logout() {
  try {
    await signOut(auth);

    // After logout, go back to the landing/login page
    window.location.href = "index.html";

  } catch (error) {
    console.error("Logout failed:", error);
  }
}


// =========================================================
// WATCH USER
// =========================================================

export function watchUser(callback) {
  onAuthStateChanged(auth, callback);
}


// =========================================================
// CHECK IF USER IS NEW
// =========================================================

// True if this Google account has no profile document yet.
export async function isNewUser(user) {
  const snap = await getDoc(
    doc(db, "users", user.uid)
  );

  return !snap.exists();
}


// =========================================================
// NAVIGATION BAR
// =========================================================

// Requires:
// <div id="navbar"></div>
// somewhere inside your page header.

function showNav(user) {

  const nav = document.getElementById("navbar");

  if (!nav) return;

  // Clear any old navigation
  nav.innerHTML = "";


  // =======================================================
  // NAVIGATION LINKS
  // =======================================================

  const links = [
    ["Home", "index.html"],
    ["I found something", "upload.html"],
    ["Messages", "messages.html"],
    ["Profile", "profile.html"]
  ];


  links.forEach(([text, href]) => {

    const a = document.createElement("a");

    a.href = href;
    a.textContent = text;

    nav.appendChild(a);
  });


  // =======================================================
  // USER AREA
  // =======================================================

  const userArea = document.createElement("div");

  userArea.className = "nav-user";


  // =======================================================
  // GOOGLE PROFILE PHOTO
  // =======================================================

  if (user.photoURL) {

    const img = document.createElement("img");

    img.src = user.photoURL;

    img.referrerPolicy = "no-referrer";

    img.alt = "Profile";

    userArea.appendChild(img);
  }


  // =======================================================
  // LOGOUT BUTTON
  // =======================================================

  const logoutBtn = document.createElement("button");

  logoutBtn.type = "button";

  logoutBtn.textContent = "Logout";


  logoutBtn.addEventListener("click", async () => {

    logoutBtn.disabled = true;
    logoutBtn.textContent = "Logging out...";

    try {

      await logout();

    } catch (error) {

      console.error("Logout failed:", error);

      logoutBtn.disabled = false;
      logoutBtn.textContent = "Logout";
    }
  });


  userArea.appendChild(logoutBtn);


  // Add user area to navbar
  nav.appendChild(userArea);
}


// =========================================================
// REQUIRE LOGIN
// =========================================================

// Use this on pages that require the user to be logged in.

export function requireLogin(callback) {

  onAuthStateChanged(auth, async (user) => {

    // -----------------------------------------------------
    // USER NOT LOGGED IN
    // -----------------------------------------------------

    if (!user) {

      window.location.href = "index.html";

      return;
    }


    // -----------------------------------------------------
    // SIGNUP PAGE
    // -----------------------------------------------------

    if (
      window.location.pathname.endsWith("signup.html")
    ) {

      callback(user);

      return;
    }


    // -----------------------------------------------------
    // CHECK PROFILE
    // -----------------------------------------------------

    if (await isNewUser(user)) {

      window.location.href = "signup.html";

      return;
    }


    // -----------------------------------------------------
    // SHOW NAVIGATION
    // -----------------------------------------------------

    showNav(user);


    // -----------------------------------------------------
    // RUN PAGE CALLBACK
    // -----------------------------------------------------

    callback(user);
  });
}