import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";
const $ = selector => document.querySelector(selector);
const grid=$("#productGrid"),statusEl=$("#status"),searchInput=$("#searchInput"),categoryFilter=$("#categoryFilter"),modal=$("#detailModal"),detailContent=$("#detailContent"),menuBtn=$("#menuBtn"),nav=$("#nav");
let entries=[],previousFocus=null;
$("#year").textContent=new Date().getFullYear();
menuBtn.addEventListener("click",()=>{const open=nav.classList.toggle("open");menuBtn.setAttribute("aria-expanded",String(open));menuBtn.setAttribute("aria-label",open?"Close navigation":"Open navigation");});
nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{nav.classList.remove("open");menuBtn.setAttribute("aria-expanded","false");menuBtn.setAttribute("aria-label","Open navigation");}));
document.querySelectorAll("[data-close]").forEach(el=>el.addEventListener("click",closeModal));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal.classList.contains("open"))closeModal();});
searchInput.addEventListener("input",render);categoryFilter.addEventListener("change",render);
function escapeHtml(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function safeImage(value){if(typeof value!=="string"||!value.trim())return "placeholder.svg";try{const u=new URL(value,location.href);return ["https:","http:"].includes(u.protocol)?u.href:"placeholder.svg";}catch{return "placeholder.svg";}}
function render(){
 const term=searchInput.value.trim().toLocaleLowerCase(),category=categoryFilter.value;
 const filtered=entries.filter(x=>(!category||x.category===category)&&(!term||[x.name,x.description,x.category].join(" ").toLocaleLowerCase().includes(term)));
 grid.replaceChildren();
 if(!filtered.length){const empty=document.createElement("div");empty.className="empty";empty.textContent=entries.length?"No matching showcase entries. Try another search.":"No published showcase entries yet. Please check again later.";grid.appendChild(empty);return;}
 filtered.forEach(item=>{
  const card=document.createElement("article");card.className="product-card";card.tabIndex=0;card.setAttribute("role","button");card.setAttribute("aria-label",`View details for ${item.name||"showcase entry"}`);
  const photo=safeImage(Array.isArray(item.photos)?item.photos[0]:item.photo);
  card.innerHTML=`<img src="${escapeHtml(photo)}" alt="${escapeHtml(item.name||"Showcase image")}" loading="lazy"><div class="card-body"><span class="category">${escapeHtml(item.category||"Showcase")}</span><h3>${escapeHtml(item.name||"Untitled entry")}</h3><p>${escapeHtml((item.description||"").slice(0,115))}${(item.description||"").length>115?"…":""}</p><span class="card-more">VIEW DETAILS ↗</span></div>`;
  card.addEventListener("click",()=>showDetails(item));card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();showDetails(item);}});
  card.querySelector("img").addEventListener("error",e=>{e.currentTarget.src="placeholder.svg";},{once:true});grid.appendChild(card);
 });
}
function showDetails(item){
 previousFocus=document.activeElement;
 const photos=(Array.isArray(item.photos)&&item.photos.length?item.photos:item.photo?[item.photo]:[]).slice(0,8);
 detailContent.innerHTML=`<span class="eyebrow">${escapeHtml(item.category||"SHOWCASE")}</span><h2 id="detailTitle">${escapeHtml(item.name||"Showcase entry")}</h2>${photos.length?`<div class="detail-gallery">${photos.map(src=>`<img src="${escapeHtml(safeImage(src))}" alt="${escapeHtml(item.name||"Showcase image")}">`).join("")}</div>`:""}<p>${escapeHtml(item.description||"No additional description provided.")}</p><small class="modal-note">Informational showcase only. This website does not offer online sales, ordering, availability confirmation, delivery or payment.</small>`;
 detailContent.querySelectorAll("img").forEach(img=>img.addEventListener("error",()=>{img.src="placeholder.svg";},{once:true}));
 modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";modal.querySelector(".close-btn").focus();
}
function closeModal(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.style.overflow="";if(previousFocus&&typeof previousFocus.focus==="function")previousFocus.focus();}
async function load(){
 if(!isFirebaseConfigured){statusEl.textContent="Showcase setup is not connected yet.";grid.innerHTML='<div class="empty">The website design is ready. The owner needs to connect the Firebase web app configuration before showcase entries can appear.</div>';return;}
 try{
  const app=initializeApp(firebaseConfig),db=getFirestore(app);
  const snapshot=await getDocs(query(collection(db,"showcaseEntries"),where("published","==",true)));
  entries=snapshot.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x&&typeof x.name==="string").sort((a,b)=>a.name.localeCompare(b.name));
  const cats=[...new Set(entries.map(x=>x.category).filter(x=>typeof x==="string"&&x.trim()))].sort();
  categoryFilter.replaceChildren(new Option("All categories",""));cats.forEach(c=>categoryFilter.add(new Option(c,c)));
  statusEl.textContent=`${entries.length} published showcase ${entries.length===1?"entry":"entries"}`;render();
 }catch(error){console.error("Showcase loading failed:",error);statusEl.textContent="The showcase could not be loaded.";grid.innerHTML='<div class="empty">Please check the Firebase web configuration, network connection and Firestore read rules.</div>';}
}
load();