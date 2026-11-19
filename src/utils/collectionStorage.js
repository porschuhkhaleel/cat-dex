import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

function userCatsRef(uid) {
  return collection(db, "users", uid, "cats");
}

export async function loadCollection(uid) {
  if (!uid) return [];
  const q = query(userCatsRef(uid), orderBy("savedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveCatToCollection(
  uid,
  { name, stickerBase64, breed, rarity, funFact }
) {
  if (!uid || !name || !stickerBase64) {
    throw new Error("Missing user, name, or sticker image.");
  }
  const entry = {
    name: name.trim(),
    stickerBase64,
    breed: breed || "Mystery Cat",
    rarity: rarity || "Common",
    funFact: funFact || "",
    savedAt: Date.now(),
  };
  const docRef = await addDoc(userCatsRef(uid), entry);
  return { id: docRef.id, ...entry };
}

export async function removeCatFromCollection(uid, catId) {
  if (!uid || !catId) return;
  await deleteDoc(doc(db, "users", uid, "cats", catId));
}