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
  serverTimestamp,
  arrayUnion
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

function addChatButton(card, claimId) {
  const chatBtn = document.createElement("button");
  chatBtn.textContent = "Chat";
  chatBtn.addEventListener("click", () => {
    if (!claimId) {
      alert("This claim has no ID — cannot open chat.");
      console.error("addChatButton called with empty claimId");
      return;
    }
    window.location.href = "chat.html?claimId=" + encodeURIComponent(claimId);
  });
  card.appendChild(chatBtn);
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

  const claimedByP = document.createElement("p");
  claimedByP.textContent = "Claimed by: ";
  const claimantLink = document.createElement("a");
  claimantLink.href = "profile.html?id=" + claim.claimantId;
  claimantLink.textContent = `${claim.name} (roll no. ${claim.rollNo})`;
  claimedByP.appendChild(claimantLink);
  card.appendChild(claimedByP);

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

  addChatButton(card, claim.id);
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

  if (item && item.finderId) {
    const foundByP = document.createElement("p");
    foundByP.textContent = "Found by: ";
    const finderLink = document.createElement("a");
    finderLink.href = "profile.html?id=" + item.finderId;
    finderLink.textContent = "View profile";
    foundByP.appendChild(finderLink);
    card.appendChild(foundByP);
  }

  if (claim.createdAt) {
    addLine(card, "Submitted on", claim.createdAt.toDate().toLocaleDateString());
  }

  const result = document.createElement("p");
  result.className = "result";
  if (claim.status === "pending") {
    result.textContent = "Waiting for the finder to review your claim.";
  } else if (claim.status === "approved") {
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

  addChatButton(card, claim.id);
  sentDiv.appendChild(card);
}
// =====================================================
// Part 3: my conversations
// =====================================================
const chatsListDiv = document.getElementById("chatsList");
const chatsStatusP = document.getElementById("chatsStatus");

async function loadChats(user) {
  chatsStatusP.textContent = "Loading...";
  chatsListDiv.innerHTML = "";

  try {
    const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
    const snap = await getDocs(q);
    let chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    chats = chats.filter((c) => !(c.hiddenFor || []).includes(user.uid));
    chats.sort((a, b) =>
      (b.lastMessageAt ? b.lastMessageAt.toMillis() : 0) -
      (a.lastMessageAt ? a.lastMessageAt.toMillis() : 0)
    );

    chatsStatusP.textContent = chats.length ? "" : "No conversations yet.";

    for (const chat of chats) {
      await renderChatRow(chat, user);
    }
  } catch (err) {
    console.error(err);
    chatsStatusP.textContent = "Could not load conversations.";
  }
}

async function renderChatRow(chat, user) {
  const otherId = chat.participants.find((id) => id !== user.uid);
  const otherSnap = await getDoc(doc(db, "users", otherId));
  const otherName = otherSnap.exists() ? otherSnap.data().name : "Student";

  const itemSnap = await getDoc(doc(db, "items", chat.itemId));
  const itemLabel = itemSnap.exists() ? itemSnap.data().category : "Item";

  const row = document.createElement("div");
  row.className = "chatRow";

  const info = document.createElement("div");
  info.style.cursor = "pointer";
  info.addEventListener("click", () => {
    window.location.href = "chat.html?claimId=" + chat.claimId;
  });

  const name = document.createElement("strong");
  name.textContent = otherName + " — " + itemLabel;

  const preview = document.createElement("p");
  preview.textContent = chat.lastMessage || "No messages yet.";

  info.append(name, preview);

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm("Remove this chat from your list? The other person will still see it.")) return;
    await updateDoc(doc(db, "chats", chat.id), {
      hiddenFor: arrayUnion(user.uid)
    });
    row.remove();
  });

  row.append(info, deleteBtn);
  chatsListDiv.appendChild(row);
}
requireLogin((user) => {
  loadReceived(user);
  loadSent(user);
  loadChats(user);
});