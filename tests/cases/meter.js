// 書き込みの量を数える: 端末ごとに、今日(17時から)何回・何単位書いたかを最終ログインの記録(seen)に載せ、管理者の画面に出す
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
let h=fs.readFileSync(REPO+'index.html','utf8');if(!h.includes('SEEN_MS=600000'))throw new Error('SEEN_MS');
h=h.replace('SEEN_MS=600000','SEEN_MS=0');fs.writeFileSync('main-test.html',h);/* 試験では10分待たずに書く */
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:''}},approved:{a:{company:'A社',vid:'a',email:'a@x.jp'}},members:{a:{company:'A社',email:'a@x.jp'}},vendors:{a:{floors:{10:{h:9,w:3,s:'2026-11-01'}}}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
const open=async(uid,email,deny)=>{const cx=await b.newContext({viewport:{width:1200,height:900}});await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
  await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
  await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
  await cx.addInitScript(([w,u,e,dn])=>{window.__FAKE_UID=u;window.__FAKE_EMAIL=e;if(dn)window.__FAKE_DENY_W=1;if(!sessionStorage.__FS)window.__FS=w},[FS,uid,email,deny]);
  const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(1000);return p};
const v=await open('a','a@x.jp');
await v.click('button[data-tab=vin]').catch(()=>{});await v.waitForTimeout(400);
for(const n of ['4','5','6']){await v.fill('#w-10',n);await v.locator('#w-10').blur();await v.waitForTimeout(400)}
await v.evaluate(()=>window.dispatchEvent(new Event('focus')));await v.waitForTimeout(600);
const w=await v.evaluate(()=>(window.__FS.seen.a||{}).w);console.log('業者の記録:',JSON.stringify(w));
ok(w&&w.n>=4&&w.c.vendors===3&&w.u>=w.n&&w.dev&&w.d,'業者の端末の書き込み(台数3回+最終ログイン)が数えられ、最終ログインの記録に載る');
await v.reload();await v.waitForTimeout(1200);await v.evaluate(()=>window.dispatchEvent(new Event('focus')));await v.waitForTimeout(600);
let w2=null;for(let i=0;i<10;i++){w2=await v.evaluate(()=>(window.__FS.seen.a||{}).w);if(w2&&w2.n>w.n)break;await v.evaluate(()=>window.dispatchEvent(new Event('focus')));await v.waitForTimeout(500)}ok(w2&&w2.n>w.n,'開き直しても続きから数える('+w.n+'→'+w2.n+')');
/* 管理者の「登録」に出る */
/* 偽の Firebase のデータは画面ごとなので、業者の画面で書いた内容を管理者の画面に渡す */
const cur=await v.evaluate(()=>window.__FS);const a=await v.context().newPage();await a.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';sessionStorage.__FS=JSON.stringify(w)},cur);
await a.goto('file://'+WORK+'/main-test.html');await a.click('#lg-google');await a.waitForTimeout(1000);
await a.click('button[data-tab=mem]').catch(()=>{});await a.waitForTimeout(600);
const t=(await a.locator('body').innerText()).match(/今日\(17時から\)の書き込み \d+回\(\d+単位\)/);console.log('管理者の画面:',t&&t[0]);ok(!!t,'管理者の「登録」に、その人の今日の書き込みが出る');
/* 書き込みを止める仕組み: 業者が1分に60回をこえて書くと止まり、赤い注意が出る。最終ログインの記録には止めたことが載る */
const z=await open('a','a@x.jp');await z.click('button[data-tab=vin]').catch(()=>{});await z.waitForTimeout(300);
const before=await z.evaluate(()=>JSON.parse(sessionStorage.__WC||'{}').vendors||0);
for(let i=0;i<65;i++){await z.fill('#w-10',String(i%9+1));await z.locator('#w-10').blur()}
await z.waitForTimeout(500);const after=await z.evaluate(()=>JSON.parse(sessionStorage.__WC||'{}').vendors||0);
const br=await z.locator('.syncbad.brake').innerText().catch(()=>'なし');console.log('65回変えた: サーバーへの書き込み',after-before,'回 / 注意:',br.replace(/\s+/g,' ').slice(0,70));
ok(after-before<=60&&after-before>=58&&/止めました/.test(br),'1分に60回をこえると、それ以上は書かず、赤い注意が出る');
await z.evaluate(()=>window.dispatchEvent(new Event('focus')));await z.waitForTimeout(600);
const zw=await z.evaluate(()=>(window.__FS.seen.a||{}).w);console.log('記録:',JSON.stringify({trip:zw&&zw.trip,why:zw&&zw.why,blk:zw&&zw.blk}));ok(zw&&zw.trip>=1&&zw.blk>=1,'止めたことが最終ログインの記録に載る(管理者に見える)');
/* ルールを貼り直す前: 量を載せずに、最終ログインだけ残す */
const d=await open('a','a@x.jp',true);await d.waitForTimeout(800);const sd=await d.evaluate(()=>window.__FS.seen&&window.__FS.seen.a);console.log('貼り直す前:',JSON.stringify(sd));
ok(sd&&sd.at&&!sd.w,'ルールを貼り直す前でも、最終ログインは残る(書き込みの量は載せない)');
console.log(bad?'NG '+bad+'件':'全部OK');await b.close()})();
