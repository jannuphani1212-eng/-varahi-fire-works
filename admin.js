import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const $ = id => document.getElementById(id);
const loginPanel = $("loginPanel"), dashboard = $("dashboard");
let auth, db, storage, owner = null, records = [];
const MAX_PHOTOS = 8, MAX_FILE_BYTES = 8 * 1024 * 1024;
function message(id, text) { $(id).textContent = text; }
function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function setBusy(button, busy, label) {
  button.disabled = busy;
  if (label) button.textContent = busy ? label : button.dataset.originalLabel || button.textContent;
}
if (!isFirebaseConfigured) {
  message("loginMessage", "Firebase is not configured yet. Add the Web App configuration before signing in.");
} else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app); db = getFirestore(app); storage = getStorage(app);
  onAuthStateChanged(auth, async user => {
    owner = user || null;
    loginPanel.hidden = !!user;
    dashboard.hidden = !user;
    if (user) await refresh();
  });
}
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!auth) return;
  message("loginMessage", "Signing in…");
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
    message("loginMessage", "");
  } catch (err) {
    message("loginMessage", friendlyError(err));
  }
});
$("signOut").addEventListener("click", async () => {
  if (!auth) return;
  try { await signOut(auth); } catch (err) { alert("Sign out failed: " + friendlyError(err)); }
});
$("resetForm").addEventListener("click", resetForm);
function friendlyError(err) {
  const code = err?.code || "";
  if (code.includes("permission-denied")) return "Access denied by Firebase Security Rules. Check that this account is the configured owner.";
  if (code.includes("network")) return "Network error. Check your internet connection and try again.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Email or password is incorrect.";
  return err?.message || "An unexpected error occurred.";
}
function resetForm() {
  $("entryForm").reset();
  $("entryId").value = "";
  $("formTitle").textContent = "Add showcase entry";
  $("published").checked = true;
  message("formMessage", "");
}
async function refresh() {
  if (!owner) return;
  $("entriesList").textContent = "Loading entries…";
  try {
    const snap = await getDocs(query(collection(db, "showcaseEntries"), orderBy("createdAt", "desc")));
    records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $("totalCount").textContent = records.length;
    $("publishedCount").textContent = records.filter(x => x.published === true).length;
    $("hiddenCount").textContent = records.filter(x => x.published !== true).length;
    renderList();
  } catch (err) {
    $("entriesList").textContent = "Could not load entries. " + friendlyError(err);
  }
}
function renderList() {
  const host = $("entriesList");
  host.replaceChildren();
  if (!records.length) { host.textContent = "No entries created yet."; return; }
  records.forEach(item => {
    const row = document.createElement("div");
    row.className = "entry-row";
    const info = document.createElement("div");
    const name = document.createElement("b"); name.textContent = item.name || "Untitled entry";
    const meta = document.createElement("small");
    meta.textContent = (item.category || "Uncategorised") + " · " + (item.published === true ? "Published" : "Hidden") + " · " + (Array.isArray(item.photos) ? item.photos.length : 0) + " photo(s)";
    info.append(name, meta);
    const actions = document.createElement("div"); actions.className = "entry-actions";
    const edit = makeButton("Edit", "secondary", () => editEntry(item.id));
    const toggle = makeButton(item.published === true ? "Hide" : "Publish", "secondary", () => toggleEntry(item.id));
    const remove = makeButton("Delete", "danger", () => removeEntry(item.id));
    actions.append(edit, toggle, remove); row.append(info, actions); host.appendChild(row);
  });
}
function makeButton(label, className, action) {
  const button = document.createElement("button");
  button.type = "button"; button.className = className; button.textContent = label; button.addEventListener("click", action);
  return button;
}
function editEntry(id) {
  const item = records.find(r => r.id === id); if (!item) return;
  $("entryId").value = id; $("name").value = item.name || "";
  $("category").value = item.category || ""; $("description").value = item.description || "";
  $("published").checked = item.published === true; $("photos").value = "";
  $("formTitle").textContent = "Edit showcase entry";
  message("formMessage", "Editing " + (item.name || "entry") + ". Leave photos empty to keep current photos.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
async function uploadPhotos(files) {
  if (files.length > MAX_PHOTOS) throw new Error("Select no more than 8 images at a time.");
  const urls = [], refs = [];
  try {
    for (const file of files) {
      if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
      if (file.size > MAX_FILE_BYTES) throw new Error("Each image must be 8 MB or smaller.");
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const unique = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random().toString(36).slice(2));
      const fileRef = ref(storage, `showcase/${owner.uid}/${Date.now()}_${unique}_${safe}`);
      await uploadBytes(fileRef, file, { contentType: file.type });
      refs.push(fileRef);
      urls.push(await getDownloadURL(fileRef));
    }
    return { urls, refs };
  } catch (err) {
    await Promise.allSettled(refs.map(fileRef => deleteObject(fileRef)));
    throw err;
  }
}
$("entryForm").addEventListener("submit", async e => {
  e.preventDefault(); if (!owner) return;
  const button = $("saveBtn"); button.disabled = true;
  message("formMessage", "Saving entry…");
  let uploaded = { urls: [], refs: [] };
  try {
    const id = $("entryId").value, old = records.find(r => r.id === id);
    const name = $("name").value.trim(), category = $("category").value.trim();
    if (!name || !category) throw new Error("Name and category are required.");
    const chosen = [...$("photos").files];
    const oldPhotos = Array.isArray(old?.photos) ? old.photos : (typeof old?.photo === "string" && old.photo ? [old.photo] : []);
    if (oldPhotos.length + chosen.length > MAX_PHOTOS) throw new Error("This entry can have up to 8 photos. Remove the entry and recreate it to replace its current photos.");
    if (chosen.length) uploaded = await uploadPhotos(chosen);
    const data = {
      name, category, description: $("description").value.trim(),
      published: $("published").checked,
      photos: chosen.length ? [...oldPhotos, ...uploaded.urls] : oldPhotos,
      updatedAt: serverTimestamp()
    };
    if (id) await updateDoc(doc(db, "showcaseEntries", id), data);
    else await addDoc(collection(db, "showcaseEntries"), { ...data, createdAt: serverTimestamp() });
    resetForm(); message("formMessage", "Entry saved successfully."); await refresh();
  } catch (err) {
    if (uploaded.refs.length) await Promise.allSettled(uploaded.refs.map(fileRef => deleteObject(fileRef)));
    message("formMessage", "Save failed: " + friendlyError(err));
  } finally { button.disabled = false; }
});
async function toggleEntry(id) {
  const item = records.find(r => r.id === id); if (!item) return;
  try {
    await updateDoc(doc(db, "showcaseEntries", id), { published: item.published !== true, updatedAt: serverTimestamp() });
    await refresh();
  } catch (err) { alert("Update failed: " + friendlyError(err)); }
}
async function removeEntry(id) {
  const item = records.find(r => r.id === id); if (!item) return;
  if (!confirm(`Delete "${item.name || "this entry"}"? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, "showcaseEntries", id));
    const photos = Array.isArray(item.photos) ? item.photos : [];
    const cleanup = await Promise.allSettled(photos.map(url => deleteObject(ref(storage, url))));
    const failed = cleanup.filter(x => x.status === "rejected").length;
    await refresh();
    if (failed) alert("The entry was deleted, but " + failed + " stored image(s) could not be removed. Check Firebase Storage manually.");
  } catch (err) { alert("Delete failed: " + friendlyError(err)); }
}
