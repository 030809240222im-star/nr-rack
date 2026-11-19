// 業者による確定後の変更のルール(firestore.rules)を、本物のルールの仕組み(Firestore エミュレーター)で確かめる。
// 動かし方: tests/rules/README.md
import {initializeTestEnvironment,assertSucceeds,assertFails} from "@firebase/rules-unit-testing";
import {doc,setDoc,getDoc,arrayUnion} from "firebase/firestore";
import fs from "node:fs";
const env=await initializeTestEnvironment({projectId:"demo-nr",firestore:{rules:fs.readFileSync(new URL("../../firestore.rules",import.meta.url),"utf8"),host:"127.0.0.1",port:8085}});
const P=process.env.PFX||"";
const ds=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);const D1=ds(2),PAST=ds(-1);/* 2日後(変えられる)・昨日(変えられない) */
await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();
  await setDoc(doc(db,P+"approved/u1"),{company:"サンオキ",email:"a@x.jp",vid:"v1"});
  await setDoc(doc(db,P+"approved/u2"),{company:"日本建工",email:"b@x.jp",vid:"v2"});
  for(const d of [D1,PAST]) await setDoc(doc(db,P+"confirmed/"+d),{rows:[{vid:"v1",floor:16,units:4,ev:1,to:null,ret:null,n:"サンオキ"},{vid:"v2",floor:19,units:2,ev:1,to:null,ret:null,n:"日本建工"}],vids:["v1","v2"],at:"x",hist:[{at:"x",by:"自動",t:"確定"}]});
  await setDoc(doc(db,P+"confirmed/"+D1+"-2"),{rows:[{vid:"v1",floor:16,units:4,ev:1}],at:"x",hist:[]});
});
const u1=env.authenticatedContext("u1",{email:"a@x.jp"}).firestore();
const vr=(v)=>({vr:{[v]:{rows:[{vid:v,floor:20,units:2,ev:1,to:null,ret:null,n:"サンオキ",rets:[{f:18,u:1},{f:20,u:1}]}],at:"2026-11-19T00:00:00Z",by:"a@x.jp"}},at:"2026-11-19T00:00:00Z",hist:arrayUnion({at:"2026-11-19T00:00:00Z",by:"a@x.jp",t:"サンオキが予定を変更: 16階 4台 → 20階 2台"})});
const t=async(name,p,ok)=>{try{await (ok?assertSucceeds:assertFails)(p);console.log("OK  "+name)}catch(e){console.log("NG  "+name+" : "+(e.message||e).slice(0,200))}};
await t("業者が自社の行(vr)を変える(回収日の前日)",setDoc(doc(u1,P+"confirmed/"+D1),vr("v1"),{merge:true}),true);
await t("業者が2回目の回(日付-2)の自社の行を変える",setDoc(doc(u1,P+"confirmed/"+D1+"-2"),vr("v1"),{merge:true}),true);
await t("ほかの業者の行(vr.v2)は変えられない",setDoc(doc(u1,P+"confirmed/"+D1),vr("v2"),{merge:true}),false);
await t("回収日を過ぎた日は変えられない",setDoc(doc(u1,P+"confirmed/"+PAST),vr("v1"),{merge:true}),false);
await t("確定の行(rows)そのものは変えられない",setDoc(doc(u1,P+"confirmed/"+D1),{rows:[]},{merge:true}),false);
const s=await getDoc(doc(u1,P+"confirmed/"+D1));console.log("保存された vr:",JSON.stringify((s.data().vr||{}).v1||null).slice(0,120));
await env.cleanup();
