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
    const q = query(collection(db, "items"), orderBy("foundAt", sortSel.value));
    const snapshot = await getDocs(q);
    allItems = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = item.photoURL;
    img.alt = item.category;

    const info = document.createElement("div");
    info.className = "info";

    const title = document.createElement("h3");
    title.textContent = item.category;

    const details = document.createElement("p");
    details.textContent = `${item.colour} • ${item.shape}`;

    const date = document.createElement("p");
    date.textContent = "Found: " + item.foundAt.toDate().toLocaleDateString();

    

        info.append(title, details, date);
    card.append(img, info);
        card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      window.location.href = "item.html?id=" + item.id;
    });
    itemsDiv.appendChild(card);
  });
}

// ---------- Events ----------
sortSel.addEventListener("change", loadItems);   // sort needs a new query
categorySel.addEventListener("change", render);  // filters just re-filter
colourSel.addEventListener("change", render);
shapeSel.addEventListener("change", render);

loadItems();
sortSel.addEventListener("change", loadItems);
categorySel.addEventListener("change", render);
colourSel.addEventListener("change", render);
shapeSel.addEventListener("change", render);

requireLogin(() => loadItems());