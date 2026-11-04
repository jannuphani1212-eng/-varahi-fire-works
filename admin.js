
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import {
  firebaseConfig,
  isFirebaseConfigured
} from "./firebase-config.js";

const $ = id => document.getElementById(id);

const loginPanel = $("loginPanel");
const dashboard = $("dashboard");

let auth = null;
let db = null;
let owner = null;
let records = [];
let busy = false;

function message(id, text) {
  $(id).textContent = text;
}

function setBusy(value) {
  busy = value;
  $("saveBtn").disabled = value;
}

function validImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function getPhotoUrls() {
  const raw = $("photoUrls").value.trim();

  if (!raw) return [];

  const urls = raw.split(/\r?\n/)
    .map(url => url.trim())
    .filter(Boolean);

  if (urls.length > 8) {
    throw new Error("Please use no more than 8 image URLs.");
  }

  for (const url of urls) {
    if (!validImageUrl(url)) {
      throw new Error("Every image must have a valid HTTPS URL.");
    }
  }

  return [...new Set(urls)];
}

function resetForm() {
  $("entryForm").reset();
  $("entryId").value = "";
  $("formTitle").textContent = "Add showcase entry";
  $("published").checked = true;
  message("formMessage", "");
}

function showDashboard(user) {
  owner = user;
  loginPanel.hidden = !!user;
  dashboard.hidden = !user;

  if (user) {
    refresh();
  } else {
    records = [];
    $("entriesList").textContent = "Sign in to manage entries.";
    $("totalCount").textContent = "0";
    $("publishedCount").textContent = "0";
    $("hiddenCount").textContent = "0";
  }
}

function updateStats() {
  $("totalCount").textContent = records.length;
  $("publishedCount").textContent =
    records.filter(item => item.published === true).length;
  $("hiddenCount").textContent =
    records.filter(item => item.published !== true).length;
}

function renderList() {
  const host = $("entriesList");
  host.replaceChildren();

  if (!records.length) {
    host.textContent = "No entries created yet.";
    return;
  }

  records.forEach(item => {
    const row = document.createElement("article");
    row.className = "entry-row";

    const details = document.createElement("div");

    const name = document.createElement("b");
    name.textContent = item.name || "Untitled entry";

    const info = document.createElement("small");
    info.textContent =
      `${item.category || "Showcase"} · ` +
      `${item.published ? "Published" : "Hidden"} · ` +
      `${(item.photos || []).length} photo(s)`;

    details.append(name, info);

    const actions = document.createElement("div");
    actions.className = "entry-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "secondary-btn";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => editEntry(item.id));

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "secondary-btn";
    toggle.textContent = item.published ? "Hide" : "Publish";
    toggle.addEventListener("click", () => toggleEntry(item.id));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger-btn";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => removeEntry(item.id));

    actions.append(edit, toggle, remove);
    row.append(details, actions);
    host.appendChild(row);
  });
}

async function refresh() {
  if (!owner || !db) return;

  message("formMessage", "Loading entries…");

  try {
    const snapshot = await getDocs(
      collection(db, "showcaseEntries")
    );

    if (!owner) return;

    records = snapshot.docs.map(item => ({
      id: item.id,
      ...item.data()
    }));

    records.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );

    updateStats();
    renderList();
    message("formMessage", "");
  } catch (error) {
    console.error(error);
    $("entriesList").textContent =
      "Could not load entries: " + error.message;
  }
}

function editEntry(id) {
  const item = records.find(record => record.id === id);
  if (!item) return;

  $("entryId").value = item.id;
  $("name").value = item.name || "";
  $("category").value = item.category || "";
  $("description").value = item.description || "";
  $("photoUrls").value = (item.photos || []).join("\n");
  $("published").checked = !!item.published;

  $("formTitle").textContent = "Edit showcase entry";

  message(
    "formMessage",
    "Editing entry. Keep or replace the image URLs as needed."
  );

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!auth) {
    message("loginMessage", "Firebase is not configured.");
    return;
  }

  const button = $("loginForm").querySelector("button");
  button.disabled = true;
  message("loginMessage", "Signing in…");

  try {
    await signInWithEmailAndPassword(
      auth,
      $("email").value.trim(),
      $("password").value
    );

    $("password").value = "";
    message("loginMessage", "");
  } catch (error) {
    console.error(error);
    message("loginMessage", "Sign-in failed. Check your email and password.");
  } finally {
    button.disabled = false;
  }
});

$("signOut").addEventListener("click", async () => {
  if (!auth) return;

  try {
    await signOut(auth);
    resetForm();
  } catch (error) {
    message("formMessage", "Sign-out failed: " + error.message);
  }
});

$("resetForm").addEventListener("click", resetForm);

$("entryForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!owner || !db || busy) return;

  setBusy(true);
  message("formMessage", "Saving entry…");

  try {
    const name = $("name").value.trim();
    const category = $("category").value.trim();
    const description = $("description").value.trim();
    const photos = getPhotoUrls();
    const id = $("entryId").value;

    if (!name || !category) {
      throw new Error("Entry name and category are required.");
    }

    const data = {
      name,
      category,
      description,
      photos,
      photo: photos[0] || "",
      published: $("published").checked,
      updatedAt: serverTimestamp()
    };

    if (id) {
      await updateDoc(
        doc(db, "showcaseEntries", id),
        data
      );
    } else {
      await addDoc(
        collection(db, "showcaseEntries"),
        {
          ...data,
          createdAt: serverTimestamp()
        }
      );
    }

    resetForm();
    message("formMessage", "Entry saved successfully.");
    await refresh();

  } catch (error) {
    console.error(error);
    message("formMessage", "Save failed: " + error.message);
  } finally {
    setBusy(false);
  }
});

async function toggleEntry(id) {
  const item = records.find(record => record.id === id);
  if (!item || !owner) return;

  try {
    await updateDoc(
      doc(db, "showcaseEntries", id),
      {
        published: !item.published,
        updatedAt: serverTimestamp()
      }
    );

    await refresh();
  } catch (error) {
    alert("Could not update entry: " + error.message);
  }
}

async function removeEntry(id) {
  const item = records.find(record => record.id === id);
  if (!item || !owner) return;

  const confirmed = confirm(
    `Delete "${item.name}"? This cannot be undone.`
  );

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "showcaseEntries", id));
    message("formMessage", "Entry deleted successfully.");
    await refresh();
  } catch (error) {
    alert("Could not delete entry: " + error.message);
  }
}

if (!isFirebaseConfigured) {
  message(
    "loginMessage",
    "Firebase configuration is incomplete. Check firebase-config.js."
  );
} else {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    onAuthStateChanged(auth, user => {
      showDashboard(user);
    });
  } catch (error) {
    console.error(error);
    message("loginMessage", "Firebase initialization failed.");
  }
}
