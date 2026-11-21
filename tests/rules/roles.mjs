// 管理者・業者・盛替え業者が、アプリでふだん行う書き込みが、ルール(firestore.rules)で通るか・拒否されるべきものが拒否されるかを確かめる。
// NRボックス版(接頭辞なし)とスクラップ版(scrap_)の両方。動かし方: tests/rules/README.md
import {initializeTestEnvironment,assertSucceeds,assertFails} from "@firebase/rules-unit-testing";
import {doc,setDoc,getDoc,deleteDoc,arrayUnion,increment,deleteField} from "firebase/firestore";
import fs from "node:fs";
const rules=fs.readFileSync(fs.existsSync("firestore.rules")?"firestore.rules":new URL("../../firestore.rules",import.meta.url),"utf8");
const env=await initializeTestEnvironment({projectId:"demo-nr",firestore:{rules,host:"127.0.0.1",port:8085}});
const now=new Date().toISOString(),ds=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10),D1=ds(2);
let ng=0;
const t=async(name,p,ok)=>{try{await (ok?assertSucceeds:assertFails)(p);console.log("OK  "+name)}catch(e){ng++;console.log("NG  "+name+" : "+String(e.message||e).split("\n")[0].slice(0,160))}};
for(const P of ["","scrap_"]){
  console.log("--- "+(P?"スクラップ版":"NRボックス版"));
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();
    await setDoc(doc(db,P+"approved/u1"),{company:"サンオキ",email:"a@x.jp",vid:"v1"});
    await setDoc(doc(db,P+"approved/u2"),{company:"日本建工",email:"b@x.jp",vid:"v2"});
    await setDoc(doc(db,P+"crews/c1"),{company:"盛替A",email:"c@x.jp"});
    await setDoc(doc(db,P+"vendors/v1"),{floors:{16:{h:6,w:4}}});
    await setDoc(doc(db,P+"notices/v1"),{items:{n1:{d:D1,kind:"change",msg:"x",at:now,by:"管理者"}}});
    await setDoc(doc(db,P+"inbox/crew"),{items:{m1:{d:D1,kind:"msg",msg:"x",at:now,by:"a",fv:"v1",fn:"サンオキ"}}});
    await setDoc(doc(db,P+"sent/v1"),{items:{m1:{to:"crew",tn:"盛替え業者",msg:"x",at:now}}});
    await setDoc(doc(db,P+"orders/v1"),{items:{o1:{f:16,u:2,st:"plan"}}});
    await setDoc(doc(db,P+"confirmed/"+D1),{rows:[{vid:"v1",floor:16,units:4,ev:1}],vids:["v1"],at:now,hist:[]});
  });
  const admin=env.authenticatedContext("g1",{email:"kowa0371@gmail.com",email_verified:true}).firestore();
  const v=env.authenticatedContext("u1",{email:"a@x.jp",email_verified:true}).firestore();
  const c=env.authenticatedContext("c1",{email:"c@x.jp",email_verified:true}).firestore();
  const x=env.authenticatedContext("zz",{email:"z@x.jp",email_verified:true}).firestore();/* 登録していない人 */
  const m=(db,p,d)=>setDoc(doc(db,P+p),d,{merge:true});
  // 最終ログイン
  await t("業者の最終ログインを記録",m(v,"seen/u1",{at:now,email:"a@x.jp",kind:"vendor"}),true);
  await t("盛替え業者の最終ログインを記録",m(c,"seen/c1",{at:now,email:"c@x.jp",kind:"crew"}),true);
  await t("管理者の最終ログインを記録",m(admin,"seen/g1",{at:now,email:"kowa0371@gmail.com",kind:"admin"}),true);
  await t("登録前の人も自分の最終ログインは記録できる",m(x,"seen/zz",{at:now,email:"z@x.jp",kind:"vendor"}),true);
  await t("管理者は最終ログインを読める",getDoc(doc(admin,P+"seen/u1")),true);
  await t("業者はほかの人の最終ログインを読めない",getDoc(doc(v,P+"seen/c1")),false);
  const W={d:"2026-11-20",n:12,u:15,c:{vendors:10,seen:2},h:{"9":12},dev:"iPhone Safari",ver:"11/21/2026 08:00:00"};
  await t("最終ログインに書き込みの量(w)を載せられる",m(v,"seen/u1",{at:now,email:"a@x.jp",kind:"vendor",w:W}),true);
  await t("書き込みの量を端末ごと(wd)に載せ、前の形(w)を消す",m(v,"seen/u1",{at:now,email:"a@x.jp",kind:"vendor",wd:{abc123:W,def456:W},w:deleteField()}),true);
  await t("端末ごとの記録が10台をこえると断る",m(v,"seen/u1",{at:now,email:"a@x.jp",kind:"vendor",wd:Object.fromEntries([...Array(11)].map((_,i)=>["d"+i,W]))}),false);
  await t("書き込みの量が地図でないと断る",m(v,"seen/u1",{at:now,email:"a@x.jp",kind:"vendor",w:"x"}),false);
  await t("書き込みの量の項目が多すぎると断る",m(v,"seen/u1",{at:now,email:"a@x.jp",kind:"vendor",w:Object.fromEntries([...Array(13)].map((_,i)=>["k"+i,i]))}),false);
  await t("最終ログインにほかの項目は載せられない",m(v,"seen/u1",{at:now,email:"a@x.jp",kind:"vendor",x:1}),false);
  await t("ほかの人の最終ログインは書けない",m(v,"seen/c1",{at:now,email:"a@x.jp",kind:"vendor"}),false);
  // 業者
  await t("業者: 自社の台数を入れる",m(v,"vendors/v1",{floors:{16:{w:increment(1)}},updated:now}),true);
  await t("業者: ほかの会社の台数は入れられない",m(v,"vendors/v2",{floors:{19:{w:1}}}),false);
  await t("業者: 追加注文",m(v,"orders/v1",{items:{o2:{f:16,u:1,st:"req",at:now}},at:now}),true);
  await t("業者: お知らせの「確認した」",m(v,"notices/v1",{ack:{n1:now}}),true);
  await t("業者: ほかの業者へ連絡",m(v,"notices/v2",{items:{m9:{d:D1,kind:"msg",msg:"こんにちは",at:now,by:"a@x.jp",fv:"v1",fn:"サンオキ"}},last:"m9"}),true);
  await t("業者: 管理者へ連絡",m(v,"inbox/admin",{items:{m8:{d:D1,kind:"msg",msg:"x",at:now,by:"a@x.jp",fv:"v1",fn:"サンオキ"}},last:"m8"}),true);
  await t("業者: 送った連絡の控え",m(v,"sent/v1",{items:{m8:{to:"admin",tn:"管理者",msg:"x",at:now}}}),true);
  await t("業者: 送信待ち(管理者・盛替え業者・業者あて)",Promise.all(["admin","crew","vendor"].map((to,i)=>setDoc(doc(v,P+"outbox/vt"+i),{to,vid:"",d:D1,msg:"x",at:now,uid:"u1"}))),true);
  await t("業者: プッシュ通知の登録",m(v,"push/u1",{subs:{a:{endpoint:"https://x"}},kind:"vendor",at:now}),true);
  await t("業者: 確定後の自社の行の変更",m(v,"confirmed/"+D1,{vr:{v1:{rows:[{vid:"v1",floor:16,units:3,ev:1}],at:now,by:"a"}},at:now,hist:arrayUnion({at:now,by:"a",t:"変更"})}),true);
  await t("業者: 確定の行そのものは変えられない",m(v,"confirmed/"+D1,{rows:[]}),false);
  await t("業者: 設定は変えられない",m(v,"config/main",{auto:5}),false);
  // 盛替え業者
  await t("盛替え: 搬出確認・戻し(st)と履歴",m(c,"confirmed/"+D1,{st:{"v1|16|1":{chk:{k:"ok",at:now}}},at:now,hist:arrayUnion({at:now,by:"c",t:"確認"})}),true);
  await t("盛替え: 戻した台数を業者の台数へ",m(c,"vendors/v1",{floors:{16:{h:increment(-1),w:increment(-1)}},updated:now}),true);
  await t("業者: 返却の記録を1件足す(まだ記録がないとき)",m(v,"plans/v1",{logs:arrayUnion({id:"r1",k:"rtn",d:D1,f:16,u:2}),at:now}),true);
  await t("業者: 返却の記録をもう1件足す",m(v,"plans/v1",{logs:arrayUnion({id:"r2",k:"rtn",d:D1,f:16,u:1}),at:now}),true);
  await t("業者: 記録を消すことはできない",setDoc(doc(v,P+"plans/v1"),{logs:[{id:"r1",k:"rtn",d:D1,f:16,u:2}],at:now}),false);
  await t("業者: 一度に2件は足せない",m(v,"plans/v1",{logs:arrayUnion({id:"r3",k:"rtn",d:D1,f:16,u:1},{id:"r4",k:"rtn",d:D1,f:16,u:1}),at:now}),false);
  await t("業者: ほかの会社の記録には足せない",m(v,"plans/v2",{logs:arrayUnion({id:"r5",k:"rtn",d:D1,f:16,u:1}),at:now}),false);
  await t("業者: 返却で自分の会社の保有台数を減らす",m(v,"vendors/v1",{floors:{16:{h:4,w:4}},updated:now}),true);
  await t("盛替え: 返却の記録(plans.logs)",m(c,"plans/v1",{logs:arrayUnion({id:"r9",k:"rtn",d:D1,f:16,u:1}),at:now}),true);
  await t("盛替え: 返却で業者の台数を減らす",m(c,"vendors/v1",{floors:{16:{h:3}},updated:now}),true);
  await t("盛替え: 返却を業者に知らせる",setDoc(doc(c,P+"outbox/rtv-1"),{to:"vendor",vid:"v1",d:D1,msg:"返却",at:now,uid:"c1"}),true);
  await t("盛替え: 追加の記録(plans.logs)",m(c,"plans/v1",{logs:arrayUnion({d:D1,f:16,u:1}),at:now}),true);
  await t("盛替え: 追加注文に「入れた」",m(c,"orders/v1",{items:{o1:{st:"done"}},at:now}),true);
  await t("盛替え: 業者への送信待ち",setDoc(doc(c,P+"outbox/ct1"),{to:"vendor",vid:"v1",d:D1,msg:"x",at:now,uid:"c1"}),true);
  await t("盛替え: 届いた連絡の「見ました」",m(c,"inbox/crew",{ack:{m1:now}}),true);
  await t("盛替え: 業者の控えに「見ました」",m(c,"sent/v1",{seen:{m1:now}}),true);
  await t("盛替え: 確定の行(rows)は変えられない",m(c,"confirmed/"+D1,{rows:[]}),false);
  // 管理者
  await t("管理者: 確定の行を変える",m(admin,"confirmed/"+D1,{rows:[{vid:"v1",floor:16,units:2,ev:1}],vr:{v1:deleteField()},at:now}),true);
  await t("管理者: 設定を変える",m(admin,"config/main",{auto:2}),true);
  await t("管理者: お知らせを出す",m(admin,"notices/v1",{items:{n2:{d:D1,kind:"change",msg:"y",at:now,by:"管理者"}}}),true);
  await t("管理者: 最終ログインの一覧を消せる",deleteDoc(doc(admin,P+"seen/u1")),true);
  await t("登録していない人は確定を読めない",getDoc(doc(x,P+"confirmed/"+D1)),false);
}
await env.cleanup();
console.log(ng?"NG "+ng+"件":"すべてOK");if(ng)process.exitCode=1;
