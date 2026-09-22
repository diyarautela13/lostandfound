import { db } from "./firebase.js";
import { requireLogin } from "./auth.js";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const itemId = new URLSearchParams(window.location.search).get("id");
const detailsDiv = document.getElementById("itemDetails");
const form = document.getElementById("claimForm");
const claimBtn = document.getElementById("claimBtn");
const claimMessage = document.getElementById("claimMessage");

const notice = document.createElement("p");
form.before(notice);

let currentUser = null;
let currentItem = null;

function addLine(label, value) {
  const p = document.createElement("p");
  p.textContent = `${label}: ${value}`;
  detailsDiv.appendChild(p);
}

function showNotice(text) {
  notice.textContent = text;
  form.style.display = "none";
  document.getElementById("claimIntro").style.display = "none";
}

// ---------- Load and show the item ----------
async function loadItem() {
  if (!itemId) {
    detailsDiv.textContent = "Item not found.";
    form.style.display = "none";
    return;
  }

  try {
    const snap = await getDoc(doc(db, "items", itemId));
    if (!snap.exists()) {
      detailsDiv.textContent = "Item not found.";
      form.style.display = "none";
      return;
    }

    const item = snap.data();
    currentItem = item;

    const img = document.createElement("img");
    img.src = item.photoURL;
    img.alt = item.category;

    const title = document.createElement("h1");
    title.textContent = item.category;

    detailsDiv.append(img, title);
    addLine("Colour", item.colour);
    addLine("Shape", item.shape);
    if (item.brand) addLine("Brand", item.brand);
    addLine("Description", item.description);
    addLine("Found on", item.foundAt.toDate().toLocaleDateString());
    const link = document.createElement("p");
    const a = document.createElement("a");
    a.href = "profile.html?id=" + item.finderId;
    a.textContent = "View finder's profile";
    link.appendChild(a);
    detailsDiv.appendChild(link);
    if (item.finderId && item.finderId === currentUser.uid) {
      showNotice("You posted this item. Claims will appear on your Messages page.");
    } else if (item.status !== "available") {
      showNotice("This item has already been returned to its owner.");
        } else {
      document.getElementById("claimIntro").style.display = "block";
      form.style.display = "block";
      document.getElementById("claimName").value = currentUser.displayName || "";
    }
  } catch (err) {
    console.error(err);
    detailsDiv.textContent = "Could not load this item.";
  }
}

// ---------- Save the claim ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !currentItem) return;

  claimBtn.disabled = true;
  claimMessage.textContent = "Submitting...";

  try {
    await addDoc(collection(db, "claims"), {
      itemId: itemId,
      finderId: currentItem.finderId || null,
      claimantId: currentUser.uid,
      claimantEmail: currentUser.email,
      name: document.getElementById("claimName").value.trim(),
      rollNo: document.getElementById("claimRoll").value.trim(),
      contact: document.getElementById("claimContact").value.trim(),
      answer: document.getElementById("claimAnswer").value.trim(),
      status: "pending",
      createdAt: serverTimestamp()
    });

    claimMessage.textContent = "Claim submitted. The finder will review it.";
    form.reset();
  } catch (err) {
    console.error(err);
    claimMessage.textContent = "Something went wrong. Please try again.";
  } finally {
    claimBtn.disabled = false;
  }
});

requireLogin((user) => {
  currentUser = user;
  loadItem();
});