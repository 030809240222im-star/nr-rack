// 業者の削除
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const k=D(3);
const FS={config:{main:{evn:2,ev:{1:[1,30],2:[31,60]}}},approved:{v1:{company:'サンオキ',vid:'v1',email:'a@x.jp'},v2:{company:'日本建工',vid:'v2'}},
 vendors:{v1:{code:'ABC234',floors:{10:{h:2,w:2}}},v2:{floors:{12:{h:5,w:2}}}},codes:{ABC234:{vid:'v1'}},days:{[k]:{cap:8,elev:[1]}},
 confirmed:{[k]:{rows:[{vid:'v1',floor:10,units:2,ev:1},{vid:'v2',floor:12,units:2,ev:1}]}}};
(async()=>{const b=await chromium.launch();const cx=await b.newContext({viewport:{width:1100,height:900}});await cx.addInitScript(()=>{try{if(!localStorage.getItem('nr-uipref'))localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});/*FULLVIEW*/
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';window.__FS=w},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(800);
await p.click('button[data-tab=vin]');await p.selectOption('#vsel','v1');await p.waitForTimeout(200);
await p.click('[data-act=vdel]');await p.waitForTimeout(200);console.log((await p.locator('.note.bad').first().innerText()).slice(0,200));
await p.click('[data-act=vdel]');await p.waitForTimeout(600);
const S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));
console.log('vendors',Object.keys(S.vendors),'approved',Object.keys(S.approved),'blocked',Object.keys(S.blocked||{}),'codes',Object.keys(S.codes||{}),'rows',S.confirmed[k].rows.map(r=>r.vid));
await b.close()})();
