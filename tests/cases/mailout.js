// メールのお知らせの送信待ち(outbox)に入る中身
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const k=D(3),t=D(0);
const FS={config:{main:{evn:2}},approved:{v1:{company:'サンオキ',vid:'v1',email:'a@x.jp'},v2:{company:'日本建工',vid:'v2'}},crews:{c1:{company:'盛替A',email:'c@x.jp'}},
 vendors:{v1:{floors:{10:{h:6,w:4}}},v2:{floors:{12:{h:6,w:4}}}},days:{[k]:{cap:8,elev:[1]},[t]:{cap:8,elev:[1]}},confirmed:{[t]:{rows:[{vid:'v2',floor:12,units:2,ev:1}]}}};
(async()=>{const b=await chromium.launch();
const open=async(uid,email,f)=>{const cx=await b.newContext({viewport:{width:1100,height:900}});await cx.addInitScript(()=>{try{if(!localStorage.getItem('nr-uipref'))localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});/*FULLVIEW*/
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID=w.uid;window.__FAKE_EMAIL=w.email;if(!sessionStorage.__FS)window.__FS=w.FS},{uid,email,FS});
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/'+(f||'main-test.html'));await p.click('#lg-google');await p.waitForTimeout(800);return {cx,p}};
const box=async p=>{const S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));return S.outbox||{}};
let {cx,p}=await open('g1','kowa0371@gmail.com');
await p.click(`[data-act=sel][data-date="${k}"]`);await p.waitForTimeout(300);await p.click('[data-act=confirm]');await p.waitForTimeout(500);
let o=await box(p);Object.keys(o).sort().forEach(id=>console.log('確定後',id,o[id].to,o[id].vid||'',JSON.stringify(o[id].msg)));
await p.click('button[data-tab=set]');await p.waitForTimeout(300);await p.check('[data-f=mailadm][data-e="kowa0371@gmail.com"]');await p.waitForTimeout(300);
console.log('受け取る管理者:',JSON.stringify((await p.evaluate(()=>JSON.parse(sessionStorage.__FS))).config.main.mailAdmins));
await cx.close();
({cx,p}=await open('c1','c@x.jp','crew-test.html'));
await p.click(`[data-act=sel][data-date="${t}"]`).catch(()=>{});await p.waitForTimeout(300);
await p.click('[data-act=chk][data-k=none]');await p.waitForTimeout(500);
o=await box(p);Object.keys(o).filter(id=>id.startsWith('k')).forEach(id=>console.log('搬出確認',id,o[id].to,JSON.stringify(o[id].msg)));
await b.close()})();
