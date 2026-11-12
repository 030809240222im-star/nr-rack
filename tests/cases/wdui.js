// 曜日ごとの担当表示
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const FS={config:{main:{evn:2,wd:{v1:[1],v2:[1,3],v3:[4]}}},approved:{v1:{company:'サンオキ',vid:'v1'},v2:{company:'日本建工',vid:'v2'},v3:{company:'萬',vid:'v3'},v4:{company:'自由',vid:'v4'}},
 vendors:{v1:{floors:{10:{h:6,w:6}}},v2:{floors:{12:{h:6,w:6}}},v3:{floors:{14:{h:6,w:6}}},v4:{floors:{15:{h:6,w:6}}}},days:{'2026-11-17':{cap:8,elev:[1]},'2026-11-12':{cap:8,elev:[1]}}};
(async()=>{const b=await chromium.launch();
for(const [n,o] of [['pc',{viewport:{width:1280,height:900}}],['ph',devices['iPhone 13']]]){
const cx=await b.newContext(o);await cx.addInitScript(()=>{try{if(!localStorage.getItem('nr-uipref'))localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});/*FULLVIEW*/
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';window.__FS=w},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(800);
console.log(n,'board:',(await p.locator('.wdboard').innerText()).replace(/\s+/g,' '));
await p.click('[data-act=sel][data-date="2026-11-17"]');await p.waitForTimeout(300);
console.log(' day17:',(await p.locator('.dhead ~ p.hint').first().innerText()).slice(0,100),'|',(await p.locator('.panel table tbody tr').allInnerTexts()).map(x=>x.replace(/\s+/g,' ').slice(0,30)).join(' / '));
await p.click('[data-act=sel][data-date="2026-11-12"]');await p.waitForTimeout(300);
console.log(' day12:',(await p.locator('.dhead ~ p.hint').first().innerText()).slice(0,80));
console.log(' sw',await p.evaluate(()=>document.documentElement.scrollWidth));
await p.screenshot({path:WORK+'/wd-'+n+'.png'});await cx.close()}
await b.close()})();
