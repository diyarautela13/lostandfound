import { db } from "./firebase.js";
import { requireLogin } from "./auth.js";
import { setupNavbar } from "./nav.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

requireLogin(async (user) => {
  setupNavbar(user);

  document.getElementById("profilePhoto").src = user.photoURL || "";
  document.getElementById("profileName").textContent = user.displayName || "";
  document.getElementById("profileEmail").textContent = user.email;

  const list = document.getElementById("myItems");
  try {
    const q = query(collection(db, "items"), where("finderId", "==", user.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      list.textContent = "You haven't posted any items yet.";
      return;
    }

    snap.forEach((d) => {
      const item = d.data();
      const a = document.createElement("a");
      a.href = "item.html?id=" + d.id;
      a.textContent = `${item.category} • ${item.colour} • ${item.status}`;
      list.appendChild(a);
    });
  } catch (err) {
    console.error(err);
    list.textContent = "Could not load your items.";
  }
});