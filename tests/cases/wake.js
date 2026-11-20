// 裏で止まっていたアプリに戻ったとき: 戻る知らせがなくても、1分以内に最終ログインを残す。1時間以上止まっていたら開き直して最新にする(入力中は開き直さない)
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:''}},approved:{v1:{company:'サンオキ',vid:'v1',email:'a@x.jp'}},vendors:{v1:{floors:{16:{h:6,w:4}}}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
async function open(){const cx=await b.newContext(devices['iPhone 13']);
 await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
 await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
 await cx.addInitScript(w=>{window.__FAKE_UID='v1';window.__FAKE_EMAIL='a@x.jp';if(!sessionStorage.__FS)window.__FS=w},FS);
 const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await p.clock.install({time:new Date(2026,10,18,9,0)});
 await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.clock.runFor(2000);return {cx,p}}
const at=async p=>((await p.evaluate(()=>JSON.parse(sessionStorage.__FS||'{}'))).seen||{}).v1;
const t0=new Date(2026,10,18,9,0).toISOString().slice(0,16);
// 1) 入力の途中で裏に回り、2日後に戻った(戻る知らせなし)。開き直さないが、1分以内に最終ログインは残す
let {cx,p}=await open();
let s=await at(p);ok(s&&s.at.startsWith(t0),'開いたときに最終ログインを残す: '+(s&&s.at));
await p.evaluate(()=>{const i=document.createElement('input');i.id='typing';document.body.appendChild(i);i.focus();window.__before=1});
await p.clock.fastForward(2*864e5);await p.clock.runFor(61000);
const still=await p.evaluate(()=>window.__before===1);s=await at(p);
console.log(' 入力中に2日止まって戻った:',still?'開き直さない':'開き直した','/ 最終ログイン',s.at);
ok(still&&s.at>='2026-11-20','入力中なら開き直さず、戻って1分以内に最終ログインを今の時刻で残す');
await cx.close();
// 2) 入力していないときに2日止まって戻った → 開き直して最新にする
({cx,p}=await open());
await p.evaluate(()=>{window.__before=1});
let nav=false;p.on('framenavigated',f=>{if(f===p.mainFrame())nav=true});
await p.clock.fastForward(2*864e5);await p.clock.runFor(61000);await p.waitForTimeout(1500);
const woke=await p.evaluate(()=>sessionStorage.getItem('nr-woke')).catch(()=>null);
console.log(' 2日止まって戻った:',nav?'開き直した':'そのまま','/ 印',woke);
ok(nav,'入力していなければ、戻ったときに開き直して最新のアプリとデータにする');
await cx.close();
await b.close();console.log(bad?'NG '+bad+'件':'すべてOK');if(bad)process.exit(1)})();
