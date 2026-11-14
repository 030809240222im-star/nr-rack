// 管理者の日の画面: 曜日の担当業者の内訳(枠・入った台数・少ない理由)
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const NOW=new Date(2026,10,14,12,0),W='2026-11-18';
const FS={config:{main:{evn:2,ev:{1:[1,40],2:[1,40]},ns:{1:'6'},wd:{t:[3],o:[3]},wper:{3:4},wdFrom:''}},approved:{t:{company:'スリーティー',vid:'t'},o:{company:'大黒屋',vid:'o'},x:{company:'萬産業',vid:'x'}},
 vendors:{t:{floors:{6:{h:3,w:3,s:'2026-11-01'},9:{h:2,w:2,s:'2026-11-01'}}},o:{floors:{12:{h:9,w:2,s:'2026-11-01'}}},x:{floors:{20:{h:9,w:9,s:'2026-11-01'}}}},days:{[W]:{cap:12,elev:[1]}}};
(async()=>{const b=await chromium.launch();
for(const [n,o] of [['ph',devices['iPhone 13']],['pc',{viewport:{width:1280,height:900}}]]){
const cx=await b.newContext(o);await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';window.__FS=w},FS);
const p=await cx.newPage();await p.clock.setFixedTime(NOW);p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(900);
await p.click(`[data-act=sel][data-date="${W}"]`);await p.waitForTimeout(300);
console.log(n,(await p.locator('details.wdx').innerText().catch(()=>'(内訳なし)')).replace(/\s+/g,' '));
console.log(' はみ出し:',await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth));
await cx.close()}
await b.close()})();
