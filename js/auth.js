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

// opens the Google popup, does NOT create a profile
export async function login() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function logout() {
  await signOut(auth);
  window.location.href = "index.html";
}

export function watchUser(callback) {
  onAuthStateChanged(auth, callback);
}

// true if this Google account has no profile document yet
export async function isNewUser(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  return !snap.exists();
}

// navigation bar: needs <div id="navbar"></div> in the page
function showNav(user) {
  const nav = document.getElementById("navbar");
  if (!nav) return;
  nav.innerHTML = "";

    const links = [
    ["Home", "listing.html"],
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

  const spacer = document.createElement("span");
  spacer.className = "spacer";
  nav.appendChild(spacer);

  if (user.photoURL) {
    const img = document.createElement("img");
    img.src = user.photoURL;
    img.referrerPolicy = "no-referrer";
    img.alt = "";
    nav.appendChild(img);
  }

  const btn = document.createElement("button");
  btn.textContent = "Logout";
  btn.addEventListener("click", logout);
  nav.appendChild(btn);
}

// use on every page except index.html and signup.html
export function requireLogin(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    if (window.location.pathname.endsWith("signup.html")) {
      callback(user);
      return;
    }
    if (await isNewUser(user)) {
      window.location.href = "signup.html";
      return;
    }
    showNav(user);
    callback(user);
  });
}