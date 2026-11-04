import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const grid = document.querySelector("#productGrid");
const statusEl = document.querySelector("#status");
const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const modal = document.querySelector("#detailModal");
const detailContent = document.querySelector("#detailContent");
let entries = [];

document.querySelector("#year").textContent = new Date().getFullYear();
document.querySelector("#menuBtn").addEventListener("click", () => document.querySelector("#nav").classList.toggle("open"));
document.querySelectorAll("#nav a").forEach(a => a.addEventListener("click", () => document.querySelector("#nav").classList.remove("open")));
document.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", () => modal.classList.remove("open")));
searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", render);

function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function render() {
  const term = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const filtered = entries.filter(item =>
    (!category || item.category === category) &&
    (!term || `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(term))
  );
  grid.innerHTML = "";
  if (!filtered.length) {
    grid.innerHTML = `<div class="empty">${entries.length ? "No matching showcase entries." : "No published entries yet. Please check again later."}</div>`;
    return;
  }
  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "product-card";
    const photo = item.photos?.[0] || item.photo || "";
    card.innerHTML = `<img src="${escapeHtml(photo || "placeholder.svg")}" alt="${escapeHtml(item.name)}" loading="lazy"><div class="card-body"><span class="category">${escapeHtml(item.category || "Showcase")}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml((item.description || "").slice(0,105))}${(item.description || "").length > 105 ? "…" : ""}</p></div>`;
    card.addEventListener("click", () => showDetails(item));
    grid.appendChild(card);
  });
}
function showDetails(item) {
  const photos = (item.photos?.length ? item.photos : item.photo ? [item.photo] : []);
  detailContent.innerHTML = `<span class="eyebrow">${escapeHtml(item.category || "SHOWCASE")}</span><h2>${escapeHtml(item.name)}</h2>${photos.length ? `<div class="detail-gallery">${photos.map(src => `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.name)}">`).join("")}</div>` : ""}<p>${escapeHtml(item.description || "No additional description provided.")}</p><small>Informational showcase only. This page does not offer online sale, ordering, availability or payment.</small>`;
  modal.classList.add("open");
}
async function load() {
  if (!isFirebaseConfigured) {
    statusEl.textContent = "Firebase setup is required. Follow README.md to connect your Firebase project.";
    grid.innerHTML = '<div class="empty">Website design is ready. Connect Firebase and publish showcase entries from the owner dashboard.</div>';
    return;
  }
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const snap = await getDocs(query(collection(db, "showcaseEntries"), where("published", "==", true)));
    entries = snap.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    const cats = [...new Set(entries.map(e=>e.category).filter(Boolean))].sort();
    cats.forEach(cat => { const opt=document.createElement("option"); opt.value=cat; opt.textContent=cat; categoryFilter.appendChild(opt); });
    statusEl.textContent = `${entries.length} published showcase ${entries.length === 1 ? "entry" : "entries"}`;
    render();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Could not load the showcase. Check Firebase setup and Firestore rules.";
    grid.innerHTML = '<div class="empty">The public showcase could not connect to Firebase. Please verify the setup in README.md.</div>';
  }
}
load();