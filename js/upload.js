import { requireLogin, logout } from "./auth.js";

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- AI setup (Firebase AI Logic + Gemini) ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-ai.js";

// Copy this from your firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyBRmgENuyTb1rs8pyWgqlaa_LZJa8hmp20",
    authDomain: "lostandfound-7c8f6.firebaseapp.com",
    projectId: "lostandfound-7c8f6",
    storageBucket: "lostandfound-7c8f6.firebasestorage.app",
    messagingSenderId: "169098876136",
    appId: "1:169098876136:web:9d7856a21e0267aac4e55d",
    measurementId: "G-DG0PZZKG98"
};

const aiApp = initializeApp(firebaseConfig, "ai-app");
const ai = getAI(aiApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, {
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" }
});

// Same values your owner-side filters already use
const CATEGORIES = ["Bottle", "Keys", "ID card", "Bag", "Phone", "Earphones", "Other"];
const COLOURS = ["Black", "White", "Blue", "Red", "Green", "Pink", "Yellow", "Orange", "Other"];
const SHAPES = ["Round", "Rectangular", "Square", "Triangular", "Cylindrical", "Other"];

function pick(value, allowed) {
  const match = allowed.find(
    (a) => a.toLowerCase() === String(value || "").trim().toLowerCase()
  );
  return match || "Other";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function analyzePhoto(file) {
  const data = await fileToBase64(file);

  const prompt = `You are helping a college lost-and-found website.
Look at this photo of a found item and reply with JSON only:
{
  "category": one of ${JSON.stringify(CATEGORIES)},
  "colour": the main colour, one of ${JSON.stringify(COLOURS)},
  "shape": one of ${JSON.stringify(SHAPES)},
  "brand": brand name if clearly visible, otherwise "",
  "description": one or two short sentences describing the item
}
Do not mention any personal information such as names or numbers visible on ID cards.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data, mimeType: file.type } }
  ]);

  const json = JSON.parse(result.response.text());

  return {
    category: pick(json.category, CATEGORIES),
    colour: pick(json.colour, COLOURS),
    shape: pick(json.shape, SHAPES),
    brand: String(json.brand || "").trim(),
    description: String(json.description || "").trim()
  };
}

// ---------- Upload the photo to Cloudinary ----------
async function uploadPhoto(file) {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", "lostfound_unsigned");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/wnyphdbh/image/upload",
    { method: "POST", body: data }
  );
  if (!res.ok) throw new Error("Photo upload failed");

  const json = await res.json();
  return json.secure_url;
}

// ---------- Handle the form ----------
const form = document.getElementById("itemForm");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("message");
const photoInput = document.getElementById("photo");
const aiStatus = document.getElementById("aiStatus");

const DEFAULT_STATUS = "Choose a photo and the item details will be detected automatically.";

let currentUser = null;
let aiResult = null;
let analysisId = 0;

const profilePicture = document.getElementById("profilePicture");

requireLogin((user) => {
  currentUser = user;

  if (profilePicture && user.photoURL) {
    profilePicture.src = user.photoURL;
    profilePicture.style.display = "block";
  }
});

// ---------- Run the AI when a photo is chosen ----------
photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  aiResult = null;

  if (!file) {
    aiStatus.textContent = DEFAULT_STATUS;
    return;
  }
  if (!file.type.startsWith("image/")) {
    aiStatus.textContent = "Please choose an image file.";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    aiStatus.textContent = "Image must be under 2 MB.";
    return;
  }

  const thisAnalysis = ++analysisId;
  submitBtn.disabled = true;
  aiStatus.textContent = "Analyzing photo...";

  try {
    const result = await analyzePhoto(file);
    if (thisAnalysis !== analysisId) return; // a newer photo was chosen

    aiResult = result;
    aiStatus.textContent =
      `Detected: ${result.category}, ${result.colour}, ${result.shape}` +
      (result.brand ? `, ${result.brand}` : "");
  } catch (err) {
    console.error("AI analysis failed:", err);
    if (thisAnalysis !== analysisId) return;
    aiStatus.textContent = "Could not analyze the photo. Please choose it again.";
  } finally {
    if (thisAnalysis === analysisId) submitBtn.disabled = false;
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) {
    message.textContent = "Please sign in first.";
    return;
  }

  const file = photoInput.files[0];
  if (!file || !file.type.startsWith("image/")) {
    message.textContent = "Please choose an image file.";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    message.textContent = "Image must be under 2 MB.";
    return;
  }
  if (!aiResult) {
    message.textContent = "Photo is not analyzed yet. Please wait or choose it again.";
    return;
  }

  submitBtn.disabled = true;
  message.textContent = "Uploading...";

  try {
    const photoURL = await uploadPhoto(file);

    const itemRef = await addDoc(collection(db, "items"), {
      category: aiResult.category,
      colour: aiResult.colour,
      shape: aiResult.shape,
      brand: aiResult.brand,
      description: aiResult.description,
      photoURL: photoURL,
      foundAt: Timestamp.fromDate(new Date(document.getElementById("foundDate").value)),
      foundLocation: document.getElementById("foundLocation").value.trim(),
      createdAt: serverTimestamp(),
      finderId: currentUser.uid,
      status: "available"
    });

    // private detail goes in a separate collection, same id as the item
    await setDoc(doc(db, "itemSecrets", itemRef.id), {
      secretDetail: document.getElementById("secretDetail").value.trim()
    });

    // pickup location is kept separate, so only approved claimants can see it
    await setDoc(doc(db, "itemPickup", itemRef.id), {
      handedOverAt: document.getElementById("handedOverAt").value.trim(),
      finderId: currentUser.uid
    });

    // the finder's email comes from their account, for the email notification later
    await setDoc(doc(db, "finderContacts", itemRef.id), {
      finderEmail: currentUser.email
    });

    message.textContent = "Item submitted successfully!";
    form.reset();
    aiResult = null;
    aiStatus.textContent = DEFAULT_STATUS;
  } catch (err) {
    console.error(err);
    message.textContent = "Something went wrong. Please try again.";
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- Logout ----------
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Logging out...";

    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);

      logoutBtn.disabled = false;
      logoutBtn.textContent = "Logout";
    }
  });
}