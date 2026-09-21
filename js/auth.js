import { auth, db } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const provider = new GoogleAuthProvider();

export function login() {
  return signInWithPopup(auth, provider);
}

export async function logout() {
  await signOut(auth);
  window.location.href = "index.html";
}

export function watchUser(callback) {
  onAuthStateChanged(auth, callback);
}

// creates the user's profile document the first time they sign in
async function saveUserProfile(user) {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        name: user.displayName || "",
        email: user.email,
        photoURL: user.photoURL || "",
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error("Could not save profile:", err);
  }
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

// use on every page except index.html: sends signed-out visitors to the home page
export function requireLogin(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    showNav(user);
    await saveUserProfile(user);
    callback(user);
  });
}