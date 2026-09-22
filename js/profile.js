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

const header = document.getElementById("profileHeader");
const details = document.getElementById("profileDetails");
const itemsSection = document.getElementById("myItemsSection");
const status = document.getElementById("postedStatus");
const list = document.getElementById("myItems");

function addLine(parent, label, value) {
  if (!value) return;
  const p = document.createElement("p");
  p.textContent = `${label}: ${value}`;
  parent.appendChild(p);
}

function renderHeader(profile) {
  header.innerHTML = "";
  if (profile.photoURL) {
    const img = document.createElement("img");
    img.src = profile.photoURL;
    img.referrerPolicy = "no-referrer";
    img.alt = "";
    img.className = "avatar";
    header.appendChild(img);
  }
  const name = document.createElement("h1");
  name.textContent = profile.name;
  header.appendChild(name);
}

async function loadPostedItems(uid) {
  try {
    const q = query(collection(db, "items"), where("finderId", "==", uid));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => b.foundAt.toMillis() - a.foundAt.toMillis());

    status.textContent = items.length ? "" : "No items posted yet.";
    list.innerHTML = "";

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        window.location.href = "item.html?id=" + item.id;
      });

      const img = document.createElement("img");
      img.src = item.photoURL;
      img.alt = item.category;

      const info = document.createElement("div");
      info.className = "info";
      const title = document.createElement("h3");
      title.textContent = item.category;
      const dateP = document.createElement("p");
      dateP.textContent = "Found: " + item.foundAt.toDate().toLocaleDateString();
      const st = document.createElement("p");
      st.textContent = "Status: " + item.status;

      info.append(title, dateP, st);
      card.append(img, info);
      list.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    status.textContent = "Could not load items.";
  }
}

requireLogin(async (currentUser) => {
  const viewedId = new URLSearchParams(window.location.search).get("id") || currentUser.uid;
  const isOwnProfile = viewedId === currentUser.uid;

  try {
    const snap = await getDoc(doc(db, "users", viewedId));
    if (!snap.exists()) {
      header.textContent = "Profile not found.";
      itemsSection.style.display = "none";
      return;
    }
    const profile = snap.data();
    renderHeader(profile);

    details.innerHTML = "";
    addLine(details, "Email", profile.email);
    addLine(details, "Roll number", profile.rollNo);
    addLine(details, "Department", profile.department);
    addLine(details, "Year", profile.year);

    if (isOwnProfile) {
      addLine(details, "Phone", profile.phone);   // visible only to the account owner
      itemsSection.querySelector("h2").textContent = "Items I posted";
    } else {
      itemsSection.querySelector("h2").textContent = "Items this student posted";
    }

    loadPostedItems(viewedId);
  } catch (err) {
    console.error(err);
    header.textContent = "Could not load this profile.";
  }
});