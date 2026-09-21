import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = document.getElementById("photo").files[0];
  if (!file || !file.type.startsWith("image/")) {
    message.textContent = "Please choose an image file.";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    message.textContent = "Image must be under 2 MB.";
    return;
  }

  submitBtn.disabled = true;
  message.textContent = "Uploading...";

  try {
    const photoURL = await uploadPhoto(file);

    const itemRef = await addDoc(collection(db, "items"), {
      category: document.getElementById("category").value,
      colour: document.getElementById("colour").value,
      shape: document.getElementById("shape").value,
      brand: document.getElementById("brand").value.trim(),
      description: document.getElementById("description").value.trim(),
      handedOverAt: document.getElementById("handedOverAt").value.trim(),
      photoURL: photoURL,
      foundAt: Timestamp.fromDate(new Date(document.getElementById("foundDate").value)),
      createdAt: serverTimestamp(),
      status: "available"
    });

    // private detail goes in a separate collection, same id as the item
    await setDoc(doc(db, "itemSecrets", itemRef.id), {
      secretDetail: document.getElementById("secretDetail").value.trim()
    });

    message.textContent = "Item submitted successfully!";
    form.reset();
  } catch (err) {
    console.error(err);
    message.textContent = "Something went wrong. Please try again.";
  } finally {
    submitBtn.disabled = false;
  }
});