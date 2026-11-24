// 利用を停止された業者・盛替え業者が、自分で「利用の再開を申し込む」→ 管理者に知らせ、「登録」に「再開の申し込み」と出る → 管理者が再開すると使える
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const old='2026-01-01T00:00:00Z',stop='2026-02-01T00:00:00Z';
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:'',auto:0}},approved:{},members:{a:{company:'A社',contact:'山田',email:'a@x.jp',at:old}},blocked:{a:{at:stop,vid:'a'}},
  crews:{},crewreq:{c1:{company:'盛替A',contact:'佐藤',email:'c@x.jp',at:old}},crewblocked:{c1:{company:'盛替A',email:'c@x.jp',at:stop}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
const open=async(uid,email,fsx,file)=>{const cx=await b.newContext({viewport:{width:1200,height:900}});await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
  await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
  await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
  await cx.addInitScript(([w,u,e])=>{window.__FAKE_UID=u;window.__FAKE_EMAIL=e;if(!sessionStorage.__FS)sessionStorage.__FS=JSON.stringify(w)},[fsx,uid,email]);
  const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/'+(file||'main-test.html'));await p.click('#lg-google');await p.waitForTimeout(1000);return p};
/* 業者 */
const v=await open('a','a@x.jp',FS);
ok(/利用が停止されています/.test(await v.locator('body').innerText())&&await v.locator('[data-act=rereq]').count()===1,'停止された業者に「利用の再開を申し込む」が出る');
await v.click('[data-act=rereq]');await v.waitForTimeout(600);
const m=await v.evaluate(()=>window.__FS.members.a),ob=await v.evaluate(()=>Object.values(window.__FS.outbox||{}).map(o=>o.to+':'+o.msg));
console.log('申し込み:',JSON.stringify(m),'/',ob.join(' '));ok(m.at>'2026-02-01'&&ob.some(x=>/^admin:.*再開の申し込み/.test(x)),'申し込みが届き、管理者に知らせる');
ok(/申し込みました/.test(await v.locator('body').innerText()),'業者の画面に「申し込みました」と出る');
/* 盛替え業者 */
const c=await open('c1','c@x.jp',await v.evaluate(()=>window.__FS),'crew-test.html');
ok(await c.locator('[data-act=crewrereq]').count()===1,'停止された盛替え業者にも「利用の再開を申し込む」が出る');
await c.click('[data-act=crewrereq]');await c.waitForTimeout(600);
/* 管理者が再開する */
const a=await open('g1','kowa0371@gmail.com',await c.evaluate(()=>window.__FS));await a.click('button[data-tab=mem]');await a.waitForTimeout(500);
const n=await a.locator('.st.warn:has-text("再開の申し込み")').count();console.log('管理者の「登録」の「再開の申し込み」:',n,'件');ok(n===2,'管理者の「登録」に、業者と盛替え業者の「再開の申し込み」が出る');
await a.click('[data-act=approve][data-id=a]');await a.waitForTimeout(400);await a.click('[data-act=crewok][data-id=c1]');await a.waitForTimeout(600);
const S=await a.evaluate(()=>window.__FS);ok(S.approved.a&&!S.blocked.a&&S.crews.c1&&!S.crewblocked.c1,'「利用を再開」で、業者も盛替え業者も使えるようになる');
console.log(bad?'NG '+bad+'件':'全部OK');await b.close()})();
