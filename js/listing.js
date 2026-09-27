
import { requireLogin } from "./auth.js";
import { setupNavbar } from "./nav.js";
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const itemsDiv = document.getElementById("items");
const statusP = document.getElementById("status");
const categorySel = document.getElementById("filterCategory");
const colourSel = document.getElementById("filterColour");
const shapeSel = document.getElementById("filterShape");
const sortSel = document.getElementById("sortDate");

let allItems = [];

// ---------- Load items from Firestore, sorted by date ----------
async function loadItems() {
  statusP.textContent = "Loading...";

  try {
    const q = query(
      collection(db, "items"),
      orderBy("foundAt", sortSel.value)
    );

    const snapshot = await getDocs(q);

    allItems = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    render();

  } catch (err) {
    console.error(err);
    statusP.textContent = "Could not load items.";
  }
}

// ---------- Apply filters and show cards ----------
function render() {
  const filtered = allItems.filter((item) =>
    item.status === "available" &&
    (!categorySel.value || item.category === categorySel.value) &&
    (!colourSel.value || item.colour === colourSel.value) &&
    (!shapeSel.value || item.shape === shapeSel.value)
  );

  itemsDiv.innerHTML = "";
  statusP.textContent = filtered.length ? "" : "No items found.";

  filtered.forEach((item) => {

    // ---------- Card ----------
    const card = document.createElement("div");
    card.className = "card";

    // ---------- Image ----------
    const img = document.createElement("img");
    img.src = item.photoURL;
    img.alt = item.category || "Found item";

    // ---------- Info ----------
    const info = document.createElement("div");
    info.className = "info";

    // ---------- Title ----------
    const title = document.createElement("h3");
    title.textContent = item.category;

    // ---------- Details ----------
    const details = document.createElement("p");
    details.textContent = `${item.colour} • ${item.shape}`;

    // ---------- Date ----------
    const date = document.createElement("p");
    date.textContent =
      "Found: " + item.foundAt.toDate().toLocaleDateString();

    // ---------- Claim Button ----------
    const claimBtn = document.createElement("button");
    claimBtn.className = "claim-btn";
    claimBtn.type = "button";
    claimBtn.textContent = "Claim Item";

    claimBtn.addEventListener("click", (event) => {
      // Prevent card click from opening item.html
      event.stopPropagation();

      // Open claim page with the item ID
      window.location.href = "item.html?id=" + item.id;
    });

    // Add everything inside card
    info.append(title, details, date, claimBtn);
    card.append(img, info);

    // ---------- Make entire card clickable ----------
    card.style.cursor = "pointer";

    card.addEventListener("click", () => {
      window.location.href = "item.html?id=" + item.id;
    });

    itemsDiv.appendChild(card);
  });
}

// ---------- Events ----------
sortSel.addEventListener("change", loadItems);

categorySel.addEventListener("change", render);
colourSel.addEventListener("change", render);
shapeSel.addEventListener("change", render);

// ---------- Start ----------
requireLogin(() => loadItems());
