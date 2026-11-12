// ＋−の連打と保存
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const FS={config:{main:{evn:2}},approved:{v1:{company:'A',vid:'v1'}},vendors:{v1:{floors:{10:{h:6,w:3}}}},days:{'2026-11-19':{cap:12,elev:[1]}}};
(async()=>{const b=await chromium.launch();const cx=await b.newContext({...devices['iPad (gen 7) landscape'],hasTouch:true});await cx.addInitScript(()=>{try{if(!localStorage.getItem('nr-uipref'))localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});/*FULLVIEW*/
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';window.__FS=w},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(800);
await p.click('[data-act=sel][data-date="2026-11-19"]');await p.waitForTimeout(300);
const plus=p.locator('#cap').locator('xpath=following-sibling::button[1]');
for(let i=0;i<5;i++){await plus.tap();await p.waitForTimeout(80)}
console.log('immediately:',await p.locator('#cap').inputValue(),'saved:',await p.evaluate(()=>JSON.parse(sessionStorage.__FS).days['2026-11-19'].cap));
await p.waitForTimeout(900);
console.log('after 0.9s:',await p.locator('#cap').inputValue(),'saved:',await p.evaluate(()=>JSON.parse(sessionStorage.__FS).days['2026-11-19'].cap));
console.log('stage panel:',await p.locator('text=停まらない階の集積指示').count());
await b.close()})();
