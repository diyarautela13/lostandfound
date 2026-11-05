
import { db } from "./firebase.js";
import { requireLogin } from "./auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// HTML elements
const header = document.getElementById("profileHeader");
const details = document.getElementById("profileDetails");
const itemsSection = document.getElementById("myItemsSection");
const status = document.getElementById("postedStatus");
const list = document.getElementById("myItems");

// Display profile information
function addLine(parent, label, value) {
  if (value === undefined || value === null || value === "") return;

  const p = document.createElement("p");
  p.textContent = `${label}: ${value}`;
  parent.appendChild(p);
}

// Display profile header
function renderHeader(profile) {
  header.innerHTML = "";

  if (profile.photoURL) {
    const img = document.createElement("img");
    img.src = profile.photoURL;
    img.referrerPolicy = "no-referrer";
    img.alt = "Profile picture";
    img.className = "avatar";
    header.appendChild(img);
  }

  const name = document.createElement("h1");
  name.textContent = profile.name || "Student";
  header.appendChild(name);
}

// Load items posted by the student
async function loadPostedItems(uid) {
  try {
    const q = query(
      collection(db, "items"),
      where("finderId", "==", uid)
    );

    const snap = await getDocs(q);

    const items = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // Sort safely by foundAt
    items.sort((a, b) => {
      const dateA = a.foundAt?.toMillis?.() || 0;
      const dateB = b.foundAt?.toMillis?.() || 0;
      return dateB - dateA;
    });

    status.textContent = items.length
      ? ""
      : "No items posted yet.";

    list.innerHTML = "";

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.cursor = "pointer";

      card.addEventListener("click", () => {
        window.location.href = "item.html?id=" + item.id;
      });

      if (item.photoURL) {
        const img = document.createElement("img");
        img.src = item.photoURL;
        img.alt = item.category || "Found item";
        card.appendChild(img);
      }

      const info = document.createElement("div");
      info.className = "info";

      const title = document.createElement("h3");
      title.textContent = item.category || "Unknown item";

      const dateP = document.createElement("p");
      dateP.textContent = item.foundAt?.toDate
        ? "Found: " + item.foundAt.toDate().toLocaleDateString()
        : "Found date unavailable";

      const st = document.createElement("p");
      st.textContent = "Status: " + (item.status || "Unknown");

      info.append(title, dateP, st);
      card.appendChild(info);
      list.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading posted items:", err);
    status.textContent = "Could not load items.";
  }
}

// Main profile loading
requireLogin(async (currentUser) => {

  const viewedId =
    new URLSearchParams(window.location.search).get("id")
    || currentUser.uid;

  const isOwnProfile = viewedId === currentUser.uid;

  try {
    const userRef = doc(db, "users", viewedId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      header.textContent = "Profile not found.";
      itemsSection.style.display = "none";
      return;
    }

    const profile = snap.data();

    console.log("Profile data from Firestore:", profile);

    // Header
    renderHeader(profile);

    // Profile details
    details.innerHTML = "";

    addLine(details, "Email", profile.email);
    addLine(details, "Roll number", profile.rollNo);
    addLine(details, "Department", profile.department);
    addLine(details, "Year", profile.year);

    if (isOwnProfile) {
      addLine(details, "Phone", profile.phone);

      itemsSection.querySelector("h2").textContent =
        "Items I posted";
    } else {
      itemsSection.querySelector("h2").textContent =
        "Items this student posted";
    }

    // Posted items
    await loadPostedItems(viewedId);

  } catch (err) {
    console.error("Profile loading error:", err);
    header.textContent = "Could not load this profile.";
  }
});
