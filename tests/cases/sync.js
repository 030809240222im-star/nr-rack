// サーバーに届いていないとき・つながっていないときは、画面の上に赤い注意を出す(本人は保存できたと思い込まないように)
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:''}},approved:{v1:{company:'サンオキ',vid:'v1',email:'a@x.jp'}},vendors:{v1:{floors:{16:{h:6,w:4}}}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
async function run(opt){const cx=await b.newContext(devices['iPhone 13']);
 await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
 await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
 await cx.addInitScript(w=>{window.__FAKE_UID='v1';window.__FAKE_EMAIL='a@x.jp';if(!sessionStorage.__FS)window.__FS=w.F;if(w.stuck)window.__FAKE_STUCK=1;if(w.stale)window.__FAKE_STALE={__all:1}},{F:FS,...opt});
 const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await p.clock.install({time:new Date(2026,10,20,9,0)});
 await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.clock.runFor(26000);
 const t=(await p.locator('.syncbad').first().innerText().catch(()=>'')).replace(/\s+/g,' ');await cx.close();return t}
let t=await run({});ok(!t,'ふだんは注意を出さない');
t=await run({stuck:1});console.log(' 届いていない:',t.slice(0,70));ok(/この端末の入力が、まだサーバーに届いていません/.test(t),'送った入力がサーバーに届かないときは、赤い注意を出す');
t=await run({stale:1});console.log(' つながっていない:',t.slice(0,70));ok(/サーバーにつながっていません/.test(t),'サーバーから最新が届かないときは、赤い注意を出す');
await b.close();console.log(bad?'NG '+bad+'件':'すべてOK');if(bad)process.exit(1)})();
