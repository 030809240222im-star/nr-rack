// in-memory fake of the firebase modules used by the page
let PEND=false;const S=window.__FS=(sessionStorage.__FS?JSON.parse(sessionStorage.__FS):(window.__FS||{}));const save=()=>sessionStorage.__FS=JSON.stringify(S);const L=[];
function emit(){L.forEach(f=>f())}
export function initializeApp(c){return {c}}
// auth
function wrap(u){if(u){u.getIdToken=async()=>'tok';u.reload=async()=>{if(sessionStorage.__VERIFIED){u.emailVerified=true;sessionStorage.__U=JSON.stringify(u)}}}return u}
let cur=wrap(sessionStorage.__U?JSON.parse(sessionStorage.__U):null),authCbs=[];
export function getAuth(){return {get currentUser(){return cur}}}
export function onAuthStateChanged(a,cb){authCbs.push(cb);setTimeout(()=>cb(cur),0)}
function setUser(u){cur=wrap(u);u=cur;if(u)sessionStorage.__U=JSON.stringify(u);else delete sessionStorage.__U;authCbs.forEach(cb=>cb(u))}
export class GoogleAuthProvider{setCustomParameters(){}}
export async function getRedirectResult(){return null}
export async function signInWithRedirect(){}
export async function signInWithPopup(){setUser({uid:window.__FAKE_UID||'g1',email:window.__FAKE_EMAIL||'admin@example.com',emailVerified:true,displayName:'G'})}
export async function signInWithEmailAndPassword(a,e,p){if(p!=='secret1')throw {code:'auth/invalid-credential'};setUser({uid:'u_'+e.split('@')[0],email:e,emailVerified:false,displayName:''})}
export async function createUserWithEmailAndPassword(a,e,p){const u={uid:'u_'+e.split('@')[0],email:e,emailVerified:false};setUser(u);return {user:u}}
export async function sendPasswordResetEmail(){}
export async function sendEmailVerification(){}
export async function signOut(){setUser(null)}
// firestore
export function initializeFirestore(){return {}}
export function persistentLocalCache(){return {}}
export function persistentMultipleTabManager(){return {}}
export function increment(n){return {__fv:'inc',n}}
export function deleteField(){return {__fv:'del'}}
export function arrayUnion(...v){return {__fv:'union',v}}
export function arrayRemove(...v){return {__fv:'rm',v}}
function mg(t,p){t=(t&&typeof t==='object'&&!Array.isArray(t))?t:{};for(const k of Object.keys(p)){const v=p[k];
  if(v&&v.__fv){if(v.__fv==='inc')t[k]=(Number(t[k])||0)+v.n;else if(v.__fv==='del')delete t[k];
    else if(v.__fv==='union'){const a=Array.isArray(t[k])?t[k].slice():[];v.v.forEach(x=>{if(!a.some(y=>JSON.stringify(y)===JSON.stringify(x)))a.push(x)});t[k]=a}
    else if(v.__fv==='rm'){const j=v.v.map(x=>JSON.stringify(x));t[k]=(t[k]||[]).filter(y=>!j.includes(JSON.stringify(y)))}}
  else if(v&&typeof v==='object'&&!Array.isArray(v))t[k]=mg(t[k],v);else t[k]=JSON.parse(JSON.stringify(v))}return t}
export function collection(f,c){return {c}}
export function doc(f,a,b){const [c,id]=b?[a,b]:a.split('/');return {c,id}}
export async function setDoc(r,d,o){S[r.c]=S[r.c]||{};S[r.c][r.id]=(o&&o.merge)?mg(S[r.c][r.id],d):JSON.parse(JSON.stringify(d));PEND=true;emit();await new Promise(z=>setTimeout(z,300));save();PEND=false;emit()}
export async function deleteDoc(r){if(S[r.c])delete S[r.c][r.id];save();setTimeout(emit,1)}
export function onSnapshot(r,o,cb,err){if(typeof o==='function'){err=cb;cb=o;o={}}const meta=!!o.includeMetadataChanges;
  const f=()=>{ if(PEND&&!meta&&false)return; if(r.id!==undefined){const d=(S[r.c]||{})[r.id];cb({id:r.id,exists:()=>!!d,data:()=>d,metadata:{hasPendingWrites:PEND}})}
    else cb({docs:Object.entries(S[r.c]||{}).map(([id,d])=>({id,data:()=>d}))})};
  L.push(f);setTimeout(f,0);return ()=>{}
}

export async function getDoc(r){const d=(S[r.c]||{})[r.id];return {exists:()=>!!d,data:()=>d}}
