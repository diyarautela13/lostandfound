import { db } from "./firebase.js";
import { requireLogin } from "./auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const receivedDiv = document.getElementById("claims");
const receivedStatus = document.getElementById("msgStatus");
const sentDiv = document.getElementById("myClaims");
const sentStatus = document.getElementById("myClaimsStatus");

function addLine(parent, label, value) {
  const p = document.createElement("p");
  p.textContent = `${label}: ${value}`;
  parent.appendChild(p);
}

function newestFirst(list) {
  list.sort((a, b) =>
    (b.createdAt ? b.createdAt.toMillis() : 0) - (a.createdAt ? a.createdAt.toMillis() : 0)
  );
}

// =====================================================
// Part 1: claims other people made on items I found
// =====================================================
async function loadReceived(user) {
  receivedStatus.textContent = "Loading...";
  receivedDiv.innerHTML = "";

  try {
    const q = query(collection(db, "claims"), where("finderId", "==", user.uid));
    const snap = await getDocs(q);
    const claims = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    newestFirst(claims);

    receivedStatus.textContent = claims.length ? "" : "No claims yet.";

    for (const claim of claims) {
      await renderReceived(claim, user);
    }
  } catch (err) {
    console.error(err);
    receivedStatus.textContent = "Could not load messages.";
  }
}

async function renderReceived(claim, user) {
  const itemSnap = await getDoc(doc(db, "items", claim.itemId));
  const secretSnap = await getDoc(doc(db, "itemSecrets", claim.itemId));
  const item = itemSnap.exists() ? itemSnap.data() : null;
  const secret = secretSnap.exists() ? secretSnap.data().secretDetail : "(not found)";

  const card = document.createElement("div");
  card.className = "claim";

  const title = document.createElement("h3");
  title.textContent = item ? `${item.category} (${item.colour}, ${item.shape})` : "Item removed";
  card.appendChild(title);

  addLine(card, "Claimed by", `${claim.name} (roll no. ${claim.rollNo})`);
  addLine(card, "Contact", `${claim.contact} / ${claim.claimantEmail}`);
  addLine(card, "Their description", claim.answer);
  addLine(card, "Your private detail", secret);
  addLine(card, "Status", claim.status);

  if (claim.status === "pending") {
    const approve = document.createElement("button");
    approve.textContent = "Approve";

    const reject = document.createElement("button");
    reject.textContent = "Reject";

    approve.addEventListener("click", async () => {
      approve.disabled = true;
      reject.disabled = true;
      try {
        await updateDoc(doc(db, "claims", claim.id), {
          status: "approved",
          reviewedAt: serverTimestamp()
        });
        if (item) {
          await updateDoc(doc(db, "items", claim.itemId), { status: "returned" });
        }

        // other pending claims for this item can no longer succeed
        const others = await getDocs(query(
          collection(db, "claims"),
          where("itemId", "==", claim.itemId),
          where("finderId", "==", user.uid)
        ));
        for (const d of others.docs) {
          if (d.id !== claim.id && d.data().status === "pending") {
            await updateDoc(d.ref, {
              status: "rejected",
              reviewNote: "This item was returned to another claimant.",
              reviewedAt: serverTimestamp()
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
      loadReceived(user);
    });

    reject.addEventListener("click", async () => {
      approve.disabled = true;
      reject.disabled = true;
      try {
        await updateDoc(doc(db, "claims", claim.id), {
          status: "rejected",
          reviewedAt: serverTimestamp()
        });
      } catch (err) {
        console.error(err);
      }
      loadReceived(user);
    });

    card.append(approve, reject);
  }

  receivedDiv.appendChild(card);
}

// =====================================================
// Part 2: claims I made on other people's items
// =====================================================
async function loadSent(user) {
  sentStatus.textContent = "Loading...";
  sentDiv.innerHTML = "";

  try {
    const q = query(collection(db, "claims"), where("claimantId", "==", user.uid));
    const snap = await getDocs(q);
    const claims = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    newestFirst(claims);

    sentStatus.textContent = claims.length ? "" : "You haven't claimed any items yet.";

    for (const claim of claims) {
      await renderSent(claim);
    }
  } catch (err) {
    console.error(err);
    sentStatus.textContent = "Could not load your claims.";
  }
}

async function renderSent(claim) {
  const itemSnap = await getDoc(doc(db, "items", claim.itemId));
  const item = itemSnap.exists() ? itemSnap.data() : null;

  const card = document.createElement("div");
  card.className = "claim status-" + claim.status;

  const title = document.createElement("h3");
  title.textContent = item ? `${item.category} (${item.colour}, ${item.shape})` : "Item removed";
  card.appendChild(title);

  if (claim.createdAt) {
    addLine(card, "Submitted on", claim.createdAt.toDate().toLocaleDateString());
  }

  const result = document.createElement("p");
  result.className = "result";
  if (claim.status === "pending") {
    result.textContent = "Waiting for the finder to review your claim.";
  }   else if (claim.status === "approved") {
    let place = "the place where the item was handed over";
    try {
      const pickupSnap = await getDoc(doc(db, "itemPickup", claim.itemId));
      if (pickupSnap.exists()) {
        place = pickupSnap.data().handedOverAt;
      } else if (item && item.handedOverAt) {
        place = item.handedOverAt;   // older test items
      }
    } catch (err) {
      console.error(err);
    }
    result.textContent = `Approved! Collect it from: ${place}. Bring your college ID.`;
  } else {
    result.textContent = "Your claim was rejected."
      + (claim.reviewNote ? " " + claim.reviewNote : "");
  }
  card.appendChild(result);

  sentDiv.appendChild(card);
}

requireLogin((user) => {
  loadReceived(user);
  loadSent(user);
});