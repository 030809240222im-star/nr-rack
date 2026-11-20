// 自動で開き直す(アプリの新しい版が出たときだけ)・最終ログインを書きすぎない・1日の上限の注意
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs'),http=require('http');
let h=fs.readFileSync(REPO+'index.html','utf8');
if(!h.includes('var AUTO_MS=3*60*1000,'))throw new Error('AUTO_MS not found');
h=h.replace('var AUTO_MS=3*60*1000,','var AUTO_MS=2500,').replace('setTimeout(checkVer,5000);','setTimeout(checkVer,500);');
let page=h;const srv=http.createServer((q,r)=>{if(/fake-fb|qrcode/.test(q.url)){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(page)}).listen(8133);
const FS={config:{main:{evn:2}},approved:{v1:{company:'A',vid:'v1'}},vendors:{v1:{floors:{10:{h:6,w:3}}}}};
(async()=>{const b=await chromium.launch();const cx=await b.newContext({viewport:{width:1100,height:800}});await cx.addInitScript(()=>{try{if(!localStorage.getItem('nr-uipref'))localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';if(!sessionStorage.__FS)window.__FS=w;window.__LOADS=(+sessionStorage.__L||0)+1;sessionStorage.__L=window.__LOADS},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('http://localhost:8133/');await p.click('#lg-google');await p.waitForTimeout(800);
const L=()=>p.evaluate(()=>+sessionStorage.__L),WC=()=>p.evaluate(()=>JSON.parse(sessionStorage.__WC||'{}').seen||0);
await p.click('button[data-tab=map]');await p.waitForTimeout(800);
console.log('最初: 読み込み',await L(),'回 / 最終ログインの書き込み',await WC(),'回');
await p.mouse.move(5,5);await p.waitForTimeout(9000);
console.log('版が同じまま9秒: 読み込み',await L(),'回(1のまま=開き直さない)');
/* 新しい版を公開する → 開き直す(画面をさわってから1分は待つので、さわった時刻を戻しておく) */
page=h.replace('</body>','<!-- v2 --></body>');await p.evaluate(()=>nrUntouch());
for(let i=0;i<20&&(await L().catch(()=>1))<2;i++)await p.waitForTimeout(500);await p.waitForTimeout(1500);
console.log('新しい版を出したあと: 読み込み',await L(),'回(2=開き直した) / タブ',await p.locator('.tabs button[aria-selected=true]').first().innerText().catch(()=>'?'));
console.log('開き直したあとの最終ログインの書き込み',await WC(),'回(1のまま=10分以内は書き直さない)');
/* 入力中は、新しい版が出ても開き直さない */
page=h.replace('</body>','<!-- v3 --></body>');await p.click('button[data-tab=set]').catch(()=>{});await p.waitForTimeout(300);await p.locator('input').first().focus();await p.evaluate(()=>nrUntouch());
const l0=await L();await p.waitForTimeout(7000);console.log('入力中: 読み込み',l0,'->',await L(),'(同じ=開き直さない)');
/* 1日の上限: Firebase の部品がエラーを記録したら、赤い注意を出す。送り終わったら消す */
await p.evaluate(()=>{window.__FAKE_STUCK=true;(window.__FAKE_LOG||[]).forEach(f=>f({level:'error',message:'@firebase/firestore: Firestore (10.12.2): FirebaseError: [code=resource-exhausted]: Quota limit exceeded.',args:[]}))});
await p.waitForTimeout(500);const q=await p.locator('.syncbad.quota').innerText().catch(()=>'なし');console.log('上限の注意:',q.replace(/\s+/g,' ').slice(0,120));
await p.evaluate(()=>{window.__FAKE_STUCK=false;nrSync()});await p.waitForTimeout(800);console.log('送り終わったあと: 注意',await p.locator('.syncbad.quota').count(),'件(0=消えた)');
await p.evaluate(()=>{(window.__FAKE_LOG||[]).forEach(f=>f({level:'error',message:'some other error',args:[]}))});await p.waitForTimeout(300);console.log('ほかのエラーでは出ない:',await p.locator('.syncbad.quota').count(),'件');
await b.close();srv.close()})();
