// 管理者: 「今日やること」の搬出確定の確認(土日祝を除いた営業日)と、曜日ごとの最大搬出数の設定
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const FS={config:{main:{evn:2,ev:{1:[1,30],2:[1,30]},wd:{v1:[2]},wdFrom:""}},approved:{v1:{company:'サンユー',vid:'v1'},v2:{company:'日本建工',vid:'v2'}},
 vendors:{v1:{floors:{10:{h:5,w:3}}},v2:{floors:{11:{h:5,w:3}}}},days:{[D(2)]:{cap:8,elev:[]},[D(30)]:{cap:8,elev:[1]}}};
(async()=>{const b=await chromium.launch();
for(const [n,o] of [['ph',devices['iPhone 13']],['pc',{viewport:{width:1280,height:900}}]]){
const cx=await b.newContext(o);await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":true}')}catch(e){}});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';if(!sessionStorage.__FS)window.__FS=w},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(900);
console.log(n,'今日やること:',(await p.locator('.task').allInnerTexts()).filter(t=>/搬出確定/.test(t)).map(t=>t.replace(/\s+/g,' ').slice(0,90)).join(' / ')||'(なし)');
await p.click('[data-act=tab][data-tab=set]');await p.waitForTimeout(300);
const inp=p.locator('input[data-f=wmax][data-vid=v1][data-w="2"]');console.log(' 火曜の最大の欄:',await inp.count());
await inp.fill('3');await inp.press('Tab');await p.waitForTimeout(400);
const S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));console.log(' 保存:',JSON.stringify(S.config.main.wmax));
console.log(' はみ出し:',await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth));
await cx.close()}
await b.close()})();
