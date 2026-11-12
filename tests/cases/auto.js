// 自動リロード
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
let h=fs.readFileSync(REPO+'index.html','utf8').replace('var AUTO_MS=3*60*1000;','var AUTO_MS=3000;');fs.writeFileSync('main-test.html',h);
const FS={config:{main:{evn:2}},approved:{v1:{company:'A',vid:'v1'}},vendors:{v1:{floors:{10:{h:6,w:3}}}}};
(async()=>{const b=await chromium.launch();const cx=await b.newContext({viewport:{width:1100,height:800}});await cx.addInitScript(()=>{try{if(!localStorage.getItem('nr-uipref'))localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});/*FULLVIEW*/
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';if(!sessionStorage.__FS)window.__FS=w;window.__LOADS=(+sessionStorage.__L||0)+1;sessionStorage.__L=window.__LOADS},FS);
const p=await cx.newPage();p.on('console',m=>{if(m.type()==='error')console.log('C',m.text())});p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(800);
console.log((await p.locator('body').innerText()).slice(0,200));await p.click('button[data-tab=map]');
await p.waitForTimeout(3000);await p.waitForSelector('.tabs button[aria-selected=true]',{timeout:8000}).catch(()=>{});await p.waitForTimeout(1500);console.log('BODY',(await p.locator('body').innerText()).replace(/\s+/g,' ').slice(0,150),p.url());console.log('tabs:',await p.locator('.tabs button[aria-selected=true]').allInnerTexts(),'nr-auto',await p.evaluate(()=>sessionStorage.getItem('nr-auto')));console.log('after wait: loads',await p.evaluate(()=>sessionStorage.__L),'tab',await p.locator('button[aria-selected=true]').first().innerText().catch(e=>'?'));
// focus input -> no reload
await p.click('button[data-tab=set]');await p.waitForTimeout(300);await p.locator('input').first().focus();const l0=await p.evaluate(()=>sessionStorage.__L);await p.waitForTimeout(7000);console.log('focused: loads',l0,'->',await p.evaluate(()=>sessionStorage.__L));
await b.close()})();
