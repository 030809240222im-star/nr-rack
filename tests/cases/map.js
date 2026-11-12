// 階マップ
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const FS={config:{main:{evn:3,fmax:30,ev:{1:[1,30],2:[1,30],3:[1,12]},ns:{2:'13,14'}}},approved:{v1:{company:'サンオキ',vid:'v1'},v2:{company:'日本建工',vid:'v2'},v3:{company:'萬',vid:'v3'}},
 vendors:{v1:{floors:{10:{h:6,w:3},12:{h:4,w:4},25:{h:2,w:2}}},v2:{floors:{10:{h:3,w:1},14:{h:5,w:5}}},v3:{floors:{25:{h:7,w:2}}}}};
(async()=>{const b=await chromium.launch();
for(const [n,o] of [['pc',{viewport:{width:1280,height:900}}],['ph',devices['iPhone 13']]]){
const cx=await b.newContext(o);await cx.addInitScript(()=>{try{if(!localStorage.getItem('nr-uipref'))localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});/*FULLVIEW*/
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';window.__FS=w},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(800);
await p.click('button[data-tab=map]');await p.waitForTimeout(300);
console.log(n,await p.locator('.fm-r').count(),'rows; sw',await p.evaluate(()=>document.documentElement.scrollWidth));
await p.check('[data-f=mapOnly]');await p.waitForTimeout(200);console.log(' only:',await p.locator('.fm-r').count());
await p.selectOption('[data-f=mapMode]','w');await p.waitForTimeout(200);console.log(' want 25F:',(await p.locator('.fm-r').first().innerText()).replace(/\s+/g,' '));
await p.screenshot({path:WORK+'/map-'+n+'.png',fullPage:true});await cx.close()}
await b.close()})();
