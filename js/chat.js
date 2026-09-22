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
  updateDoc,
  deleteDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const claimId = new URLSearchParams(window.location.search).get("claimId");
const headerDiv = document.getElementById("chatHeader");
const messagesDiv = document.getElementById("chatMessages");
const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");

let currentUser = null;
let otherUserId = null;
let chatRef = null;

async function ensureChat(claim) {
  chatRef = doc(db, "chats", claimId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      claimId: claimId,
      itemId: claim.itemId,
      participants: [claim.finderId, claim.claimantId],
      hiddenFor: [],
      createdAt: serverTimestamp()
    });
  }
  return chatRef;
}

async function deleteWholeChat() {
  if (!confirm("Remove this chat from your Chats list? The other person will still see it.")) return;
  await updateDoc(chatRef, { hiddenFor: arrayUnion(currentUser.uid) });
  window.location.href = "chats.html";
}

async function deleteOneMessage(msgId) {
  if (!confirm("Delete this message for everyone?")) return;
  try {
    await deleteDoc(doc(chatRef, "messages", msgId));
  } catch (err) {
    console.error(err);
  }
}

function renderMessage(msg, msgId) {
  const wrap = document.createElement("div");
  wrap.className = "msgRow " + (msg.senderId === currentUser.uid ? "mine" : "theirs");

  const bubble = document.createElement("div");
  bubble.className = "msg " + (msg.senderId === currentUser.uid ? "mine" : "theirs");
  bubble.textContent = msg.text;
  wrap.appendChild(bubble);

  // only the sender can delete their own message
  if (msg.senderId === currentUser.uid) {
    const delBtn = document.createElement("button");
    delBtn.className = "msgMenuBtn";
    delBtn.textContent = "⋮";
    delBtn.title = "Delete this message";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteOneMessage(msgId);
    });
    wrap.appendChild(delBtn);
  }

  messagesDiv.appendChild(wrap);
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

  const deleteChatBtn = document.createElement("button");
  deleteChatBtn.textContent = "Delete entire chat";
  deleteChatBtn.addEventListener("click", () => deleteWholeChat());

  headerDiv.append(h1, link, deleteChatBtn);

  await ensureChat(claim);

  const q = query(collection(chatRef, "messages"), orderBy("createdAt", "asc"));
  onSnapshot(q, (snap) => {
    messagesDiv.innerHTML = "";
    snap.forEach((d) => renderMessage(d.data(), d.id));
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
      lastMessageAt: serverTimestamp(),
      hiddenFor: []
    });
  });
}

requireLogin((user) => start(user));