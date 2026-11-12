import {DB,save} from "./store.js";
const DEL={__del:1};
export const FieldValue={delete:()=>DEL,arrayUnion:(...v)=>({__union:v}),increment:n=>({__inc:n})};
function merge(t,s){for(const k of Object.keys(s)){const v=s[k];if(v===DEL)delete t[k];else if(v&&v.__union){t[k]=[...(t[k]||[]),...v.__union]}else if(v&&typeof v==="object"&&!Array.isArray(v)){t[k]=merge(t[k]&&typeof t[k]==="object"?t[k]:{},v)}else t[k]=v}return t}
function docRef(path){const [c,id]=path.split("/");return {id,path,
  get:async()=>({exists:!!(DB[c]||{})[id],data:()=>JSON.parse(JSON.stringify((DB[c]||{})[id]||null))||undefined}),
  set:async(o,opt)=>{DB[c]=DB[c]||{};DB[c][id]=opt&&opt.merge?merge(DB[c][id]||{},o):merge({},o)},
  update:async(o)=>{DB[c]=DB[c]||{};const t=DB[c][id]||{};for(const k of Object.keys(o)){const ps=k.split(".");let x=t;for(let i=0;i<ps.length-1;i++)x=x[ps[i]]=x[ps[i]]||{};if(o[k]===DEL)delete x[ps.at(-1)];else x[ps.at(-1)]=o[k]}DB[c][id]=t},
  delete:async()=>{if(DB[c])delete DB[c][id]}}}
export function getFirestore(){return {doc:p=>docRef(p),collection:c=>({doc:id=>docRef(c+"/"+id),get:async()=>{const m=DB[c]||{};const docs=Object.keys(m).map(id=>({id,ref:docRef(c+"/"+id),data:()=>JSON.parse(JSON.stringify(m[id]))}));return {empty:!docs.length,size:docs.length,forEach:f=>docs.forEach(f),docs}}})}}
