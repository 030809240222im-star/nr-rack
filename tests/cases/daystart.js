// 夜間の作業: 6時より前は前の日として扱う(盛替え業者の「本日」・管理者のカレンダー)
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const FS={config:{main:{evn:2}},approved:{v1:{company:'サンユー',vid:'v1'}},crews:{c1:{company:'盛替A',email:'c@x.jp'}},vendors:{v1:{floors:{10:{h:5,w:3}}}},
 days:{'2026-11-17':{cap:8,elev:[1],tf:'22:00',tt:'23:00'}},confirmed:{'2026-11-17':{rows:[{vid:'v1',floor:10,units:3,ev:1,n:'サンユー'}]}}};
(async()=>{const b=await chromium.launch();
for(const [lbl,t] of [['11/18 3:00',new Date(2026,10,18,3,0)],['11/18 6:30',new Date(2026,10,18,6,30)]]){
const cx=await b.newContext(devices['iPhone 13']);await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='c1';window.__FAKE_EMAIL='c@x.jp';window.__FS=w},FS);
const p=await cx.newPage();await p.clock.setFixedTime(t);p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/crew-test.html');await p.click('#lg-google');await p.waitForTimeout(900);
const box=await p.locator('.todaybox').allInnerTexts();console.log(lbl,'本日の表示:',box.some(x=>/本日は搬出日/.test(x))?'あり(11/17の作業として表示)':'なし');
await cx.close()}
await b.close()})();
