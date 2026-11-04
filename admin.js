import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const $ = id => document.getElementById(id);
const loginPanel=$("loginPanel"), dashboard=$("dashboard");
let auth, db, storage, owner=null, records=[];
function message(id,text){$(id).textContent=text;}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
if (!isFirebaseConfigured) message("loginMessage","First complete Firebase configuration in firebase-config.js and deploy the security rules.");
else {
  const app=initializeApp(firebaseConfig); auth=getAuth(app); db=getFirestore(app); storage=getStorage(app);
  onAuthStateChanged(auth,user=>{owner=user;loginPanel.hidden=!!user;dashboard.hidden=!user;if(user) refresh();});
}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();if(!auth)return;message("loginMessage","Signing in…");try{await signInWithEmailAndPassword(auth,$("email").value,$("password").value);message("loginMessage","");}catch(err){message("loginMessage","Sign in failed: "+err.message);}});
$("signOut").addEventListener("click",()=>signOut(auth));
$("resetForm").addEventListener("click",resetForm);
function resetForm(){ $("entryForm").reset();$("entryId").value="";$("formTitle").textContent="Add showcase entry";$("published").checked=true;message("formMessage","");}
async function refresh(){
  try{const snap=await getDocs(query(collection(db,"showcaseEntries"),orderBy("createdAt","desc")));records=snap.docs.map(d=>({id:d.id,...d.data()}));$("totalCount").textContent=records.length;$("publishedCount").textContent=records.filter(x=>x.published).length;$("hiddenCount").textContent=records.filter(x=>!x.published).length;renderList();}
  catch(err){$("entriesList").textContent="Could not load entries. Check Firestore rules: "+err.message;}
}
function renderList(){
  const host=$("entriesList");host.innerHTML="";
  if(!records.length){host.textContent="No entries created yet.";return;}
  records.forEach(item=>{const row=document.createElement("div");row.className="entry-row";row.innerHTML=`<div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.category||"")} · ${item.published?"Published":"Hidden"} · ${(item.photos||[]).length} photo(s)</small></div><div class="entry-actions"><button data-edit="${item.id}" class="secondary">Edit</button><button data-toggle="${item.id}" class="secondary">${item.published?"Hide":"Publish"}</button><button data-delete="${item.id}" class="danger">Delete</button></div>`;host.appendChild(row);});
  host.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editEntry(b.dataset.edit));
  host.querySelectorAll("[data-toggle]").forEach(b=>b.onclick=()=>toggleEntry(b.dataset.toggle));
  host.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>removeEntry(b.dataset.delete));
}
function editEntry(id){const x=records.find(r=>r.id===id);if(!x)return;$("entryId").value=id;$("name").value=x.name||"";$("category").value=x.category||"";$("description").value=x.description||"";$("published").checked=!!x.published;$("formTitle").textContent="Edit showcase entry";message("formMessage",`Editing ${x.name}. Leave photos empty to keep existing photos.`);window.scrollTo({top:0,behavior:"smooth"});}
async function uploadPhotos(files){
  if(files.length>8)throw new Error("Please select no more than 8 images.");
  const urls=[];
  for(const file of files){if(!file.type.startsWith("image/"))throw new Error("Only image files are allowed.");if(file.size>8*1024*1024)throw new Error("Each image must be 8 MB or smaller.");const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=`showcase/${owner.uid}/${Date.now()}_${crypto.randomUUID()}_${safe}`;const r=ref(storage,path);await uploadBytes(r,file,{contentType:file.type});urls.push(await getDownloadURL(r));}
  return urls;
}
$("entryForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!owner)return;
 const btn=$("saveBtn");btn.disabled=true;message("formMessage","Saving entry and uploading selected photos…");
 try{
  const id=$("entryId").value;const old=records.find(r=>r.id===id);const chosen=[...$("photos").files];const uploaded=chosen.length?await uploadPhotos(chosen):[];
  const data={name:$("name").value.trim(),category:$("category").value.trim(),description:$("description").value.trim(),published:$("published").checked,photos:uploaded.length?uploaded:(old?.photos||[]),updatedAt:serverTimestamp()};
  if(!data.name||!data.category)throw new Error("Name and category are required.");
  if(id)await updateDoc(doc(db,"showcaseEntries",id),data);else await addDoc(collection(db,"showcaseEntries"),{...data,createdAt:serverTimestamp()});
  resetForm();message("formMessage","Saved successfully.");await refresh();
 }catch(err){message("formMessage","Save failed: "+err.message);}finally{btn.disabled=false;}
});
async function toggleEntry(id){try{const x=records.find(r=>r.id===id);await updateDoc(doc(db,"showcaseEntries",id),{published:!x.published,updatedAt:serverTimestamp()});await refresh();}catch(e){alert("Update failed: "+e.message);}}
async function removeEntry(id){const x=records.find(r=>r.id===id);if(!confirm(`Delete "${x?.name||"this entry"}"? This cannot be undone.`))return;try{await deleteDoc(doc(db,"showcaseEntries",id));await refresh();}catch(e){alert("Delete failed: "+e.message);}}
