import { db } from "./firebase.js";
import { requireLogin } from "./auth.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const claimId = new URLSearchParams(window.location.search).get("claimId");
const headerDiv = document.getElementById("chatHeader");
const messagesDiv = document.getElementById("chatMessages");
const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");

let currentUser = null;
let otherUserId = null;

async function ensureChat(claim) {
  // the chat document uses the claim's own id, so there's exactly one thread per claim
  const chatRef = doc(db, "chats", claimId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      claimId: claimId,
      itemId: claim.itemId,
      participants: [claim.finderId, claim.claimantId],
      createdAt: serverTimestamp()
    });
  }
  return chatRef;
}

function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "msg " + (msg.senderId === currentUser.uid ? "mine" : "theirs");
  div.textContent = msg.text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function start(user) {
  currentUser = user;

  if (!claimId) {
    headerDiv.textContent = "Chat not found.";
    form.style.display = "none";
    return;
  }

  const claimSnap = await getDoc(doc(db, "claims", claimId));
  if (!claimSnap.exists()) {
    headerDiv.textContent = "This claim no longer exists.";
    form.style.display = "none";
    return;
  }
  const claim = claimSnap.data();

  // only the finder and the claimant may open this chat
  if (user.uid !== claim.finderId && user.uid !== claim.claimantId) {
    headerDiv.textContent = "You don't have access to this chat.";
    form.style.display = "none";
    return;
  }

  otherUserId = user.uid === claim.finderId ? claim.claimantId : claim.finderId;

  const otherSnap = await getDoc(doc(db, "users", otherUserId));
  const otherName = otherSnap.exists() ? otherSnap.data().name : "Student";

  headerDiv.innerHTML = "";
  const h1 = document.createElement("h1");
  h1.textContent = "Chat with " + otherName;
  const link = document.createElement("a");
  link.href = "profile.html?id=" + otherUserId;
  link.textContent = "View profile";
  headerDiv.append(h1, link);

  const chatRef = await ensureChat(claim);

  // live updates: new messages appear instantly for both people
  const q = query(collection(chatRef, "messages"), orderBy("createdAt", "asc"));
  onSnapshot(q, (snap) => {
    messagesDiv.innerHTML = "";
    snap.forEach((d) => renderMessage(d.data()));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";

    await addDoc(collection(chatRef, "messages"), {
      senderId: currentUser.uid,
      text: text,
      createdAt: serverTimestamp()
    });
    await updateDoc(chatRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp()
    });
  });
}

requireLogin((user) => start(user));