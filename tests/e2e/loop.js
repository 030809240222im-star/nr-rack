// 書き込みの数を数える: 本番のデータを手元のエミュレーターに写し(GitHub の中だけ。外には出さない)、管理者2人・業者1人の画面を開いたまま置いて、
// アプリがどの集まりに何回書き込むかを数える。ログには集まりの名前と回数だけを出す(名前・メールアドレス・中身は出さない)。
// 本番がなければ(FIREBASE_SERVICE_ACCOUNT がない)、手元の試しのデータで同じことをする。
const {chromium}=require('playwright');const fs=require('fs'),http=require('http');
const FB=fs.readFileSync(__dirname+'/fb.js','utf8');
let html=fs.readFileSync(process.env.HTML||__dirname+'/../../index.html','utf8');
html=html.replace('import {initializeApp} from','import {initializeApp,connectAuthEmulator,connectFirestoreEmulator} from');
html=html.replace('var fb=initializeApp(CFG.firebase),auth=getAuth(fb),fs=openStore(fb);','var fb=initializeApp(CFG.firebase),auth=getAuth(fb),fs=openStore(fb);connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});connectFirestoreEmulator(fs,"127.0.0.1",8085);');
/* 書き込みを数える */
const W='(window.__W=window.__W||{},window.__W[k]=(window.__W[k]||0)+1)';
const hook=(a,b)=>{if(!html.includes(a))throw new Error('hook failed: '+a.slice(0,40));html=html.split(a).join(b)};
hook('doc:function(p){var r=doc(fs,PFX+p);return {','doc:function(p){var r=doc(fs,PFX+p),w=function(t){var k=t+" "+String(p).split("/")[0];'+W+'};return {');
hook('set:function(d){return setDoc(r,d)}','set:function(d){w("set");return setDoc(r,d)}');
hook('patch:function(d){return setDoc(r,fsVal(d),{merge:true})}','patch:function(d){w("patch");return setDoc(r,fsVal(d),{merge:true}).catch(function(e){w("拒否 "+(e&&e.code));throw e})}');
hook('delete:function(){return deleteDoc(r)}','delete:function(){w("delete");return deleteDoc(r)}');
hook('create:function(d){return runTransaction(','create:function(d){w("create");return runTransaction(');
if(!html.includes('connectFirestoreEmulator(fs'))throw new Error('hook failed');
const srv=http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(html)}).listen(8099);
const DB='http://127.0.0.1:8085/v1/projects/nr-rack/databases/default/documents/';
const val=v=>v===null||v===undefined?{nullValue:null}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?(Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}):typeof v==='string'?{stringValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(val)}}:(v&&typeof v.toDate==='function')?{timestampValue:v.toDate().toISOString()}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,val(x)]))}};
const put=(p,d)=>fetch(DB+p,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:val(d).mapValue.fields})}).then(r=>r.json());
const AU='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/';
const user=async(email)=>{const j=await fetch(AU+'accounts:signUp?key=k',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'secret12',returnSecureToken:true})}).then(r=>r.json());
  await fetch(AU+'accounts:update?key=k',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({localId:j.localId,emailVerified:true})});return j.localId};
const QR=fs.readFileSync(__dirname+'/../lib/qrcode.min.js','utf8');
const routes=async cx=>{
  await cx.route(/gstatic\.com\/firebasejs\/10\.12\.2\/firebase-app\.js/,r=>r.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:FB}));
  await cx.route(/gstatic\.com\/firebasejs\/10\.12\.2\/firebase-(auth|firestore)\.js/,r=>r.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:'export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";'}));
  await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:QR}));
};
const COLLS=["seen","approved","members","blocked","codes","crews","crewreq","crewblocked","vendors","days","confirmed","notices","inbox","sent","orders","plans","push","config"];
const ADMINS=[...new Set((fs.readFileSync(__dirname+'/../../firestore.rules','utf8').match(/'[^'\s]+@[^'\s]+'/g)||[]).map(s=>s.slice(1,-1)))];
const MS=Number(process.env.IDLE_MS||200000);
(async()=>{
  let vendorUid=null;
  const sa=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT||'null');
  const a1=await user(ADMINS[0]),a2=await user(ADMINS[1]),vu=await user('v@example.jp');
  if(sa){
    /* 本番から読む(emulators:exec が入れるエミュレーター向けの設定を外す。エミュレーターへは REST で書く) */
    const EH=process.env.FIRESTORE_EMULATOR_HOST;delete process.env.FIRESTORE_EMULATOR_HOST;delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    const admin=require(process.env.ADMIN_SDK||'firebase-admin');admin.initializeApp({credential:admin.credential.cert(sa)});
    const {getFirestore}=require((process.env.ADMIN_SDK||'firebase-admin')+'/lib/firestore/index.js');const db=getFirestore(admin.app(),'default');
    let n=0;
    for(const c of COLLS){const s=await db.collection(c).get();for(const d of s.docs){await put(c+'/'+d.id,d.data());n++}
      /* 業者1人: 承認された人の1人に、この試しの業者をなりすまさせる(同じ会社として) */
      if(c==='approved'&&s.docs.length){const x=s.docs.find(d=>(d.data()||{}).vid)||s.docs[0];const xd=x.data();await put('approved/'+vu,Object.assign({},xd,{email:'v@example.jp',vid:xd.vid||x.id}));await put('members/'+vu,{company:xd.company||'',email:'v@example.jp',at:'2026-11-01T00:00:00Z'})}}
    console.log('本番のデータを写しました: '+n+'件');if(!n)throw new Error('本番のデータを読めませんでした');
  }else{
    await put('config/main',{evn:1,ev:{1:[1,40]},wdFrom:''});
    await put('approved/'+vu,{company:'A社',email:'v@example.jp',vid:vu,at:'2026-11-01T00:00:00Z'});
    await put('members/'+vu,{company:'A社',email:'v@example.jp',at:'2026-11-01T00:00:00Z'});
    await put('vendors/'+vu,{floors:{16:{h:6,w:4,s:'2026-11-01'}}});
    console.log('試しのデータで動かします');
  }
  const b=await chromium.launch();
  const open=async(email,simple)=>{const cx=await b.newContext({viewport:{width:1100,height:900}});await cx.addInitScript(s=>{try{localStorage.setItem('nr-uipref',JSON.stringify({simple:s}))}catch(e){}},simple);
    await routes(cx);const p=await cx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
    let total={};p.on('framenavigated',async()=>{});
    await p.goto('http://localhost:8099/');await p.waitForSelector('#lg-email',{timeout:30000});await p.fill('#lg-email',email);await p.fill('#lg-pass','secret12');await p.click('#lg-go');
    return {p,errs,total}};
  const pages={admin1:await open(ADMINS[0],false),admin2:await open(ADMINS[1],true),vendor:await open('v@example.jp',true)};
  /* 画面を開き直す(3分ごとの自動リロード)と数がリセットされるので、こまめに集める */
  const acc={};const grab=async()=>{for(const [k,v] of Object.entries(pages)){const w=await v.p.evaluate(()=>{var x=window.__W||{};window.__W={};return x}).catch(()=>({}));acc[k]=acc[k]||{};for(const [t,n] of Object.entries(w))acc[k][t]=(acc[k][t]||0)+n}};
  const t0=Date.now();while(Date.now()-t0<MS){await new Promise(r=>setTimeout(r,2000));await grab()}
  console.log('===== '+Math.round(MS/1000)+'秒、開いたまま置いたときの書き込み(種類 集まり: 回数)');
  for(const [k,v] of Object.entries(acc)){const tot=Object.values(v).reduce((a,b)=>a+b,0);console.log(k+': 計 '+tot+'回 '+JSON.stringify(v));}
  for(const [k,v] of Object.entries(pages))if(v.errs.length)console.log(k+' の画面のエラー: '+v.errs.slice(0,3).join(' | '));
  await b.close();srv.close();process.exit(0);
})().catch(e=>{console.log('失敗: '+e.message);process.exit(1)});
