// NRボックスの返却: 業者・管理者が報告すると、その階の保有台数から自動で引く(出したい台数は保有台数まで)。記録・集計に出て、管理者は取り消せる
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:'',auto:0}},approved:{a:{company:'A社',vid:'a',email:'a@x.jp'}},members:{a:{company:'A社',email:'a@x.jp'}},
  vendors:{a:{floors:{10:{h:9,w:8,s:'2026-11-01'},12:{h:3,w:0}}}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
const open=async(uid,email,simple,fsx,file)=>{const cx=await b.newContext({viewport:{width:1200,height:900}});await cx.addInitScript(s=>{try{localStorage.setItem('nr-uipref',JSON.stringify({simple:s}))}catch(e){}},simple);
  await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
  await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
  await cx.addInitScript(([w,u,e])=>{window.__FAKE_UID=u;window.__FAKE_EMAIL=e;if(!sessionStorage.__FS)sessionStorage.__FS=JSON.stringify(w)},[fsx,uid,email]);
  const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/'+(file||'main-test.html'));await p.click('#lg-google');await p.waitForTimeout(1000);return p};
const fl=p=>p.evaluate(()=>window.__FS.vendors.a.floors);
/* 業者(詳しい表示): 10階から2台返却 */
const v=await open('a','a@x.jp',false,FS);await v.click('button[data-tab=vin]');await v.waitForTimeout(400);
await v.selectOption('#rt-f','10');await v.fill('#rt-u','2');await v.fill('#rt-m','リース会社へ');await v.click('[data-act=rtn]');await v.waitForTimeout(600);
let f=await fl(v);console.log('業者が10階から2台返却:',JSON.stringify(f['10']),'/',(await v.locator('.note.ok').innerText().catch(()=>'')).slice(0,60));
ok(f['10'].h===7&&f['10'].w===7,'保有9台→7台。出したい台数8台は、保有の7台にそろう');
const ob=await v.evaluate(()=>Object.values(window.__FS.outbox||{}).filter(o=>o.to==='admin').map(o=>o.msg));console.log('管理者への知らせ:',ob[0]);ok(ob.length===1&&/返却/.test(ob[0]),'管理者に知らせる');
const lg=await v.evaluate(()=>window.__FS.plans.a.logs);ok(lg.length===1&&lg[0].k==='rtn'&&lg[0].u===2,'返却の記録が残る');
ok(/返却 リース会社へ/.test(await v.locator('body').innerText()),'業者の「追加・棚卸し・返却の記録」に出る');
/* 多すぎる台数は断る */
await v.selectOption('#rt-f','12');await v.fill('#rt-u','5');await v.click('[data-act=rtn]');await v.waitForTimeout(400);
f=await fl(v);ok(f['12'].h===3&&/それより多くは返却できません/.test(await v.locator('.note.bad').innerText().catch(()=>'')),'保有より多い台数は断る');
/* 業者(簡単な表示) */
const cur=await v.evaluate(()=>window.__FS);
const s=await open('a','a@x.jp',true,cur);await s.click('[data-tab=s-count]');await s.waitForTimeout(400);
await s.selectOption('#rt-f','12');await s.fill('#rt-u','1');await s.click('[data-act=rtn]');await s.waitForTimeout(500);
f=await fl(s);ok(f['12'].h===2,'簡単な表示からも返却を報告できる(12階 3→2台)');
/* 管理者: 記録で返却を記録・取り消し、集計に出る */
const cur2=await s.evaluate(()=>window.__FS);
const a=await open('g1','kowa0371@gmail.com',false,cur2);await a.click('button[data-tab=rec]');await a.waitForTimeout(600);
await a.selectOption('#rt-f','10');await a.fill('#rt-u','1');await a.click('[data-act=rtn]');await a.waitForTimeout(600);
f=await fl(a);ok(f['10'].h===6,'管理者も返却を記録できる(10階 7→6台)');
const rows=await a.locator('.st.bad:has-text("返却")').count();console.log('記録の「返却」:',rows,'件');ok(rows===3,'管理者の記録に「返却」が3件出る');
await a.locator('[data-act=recdel]').first().click();await a.waitForTimeout(200);await a.locator('[data-act=recdel]').first().click();await a.waitForTimeout(600);
const tot=Object.values(await fl(a)).reduce((x,y)=>x+y.h,0);console.log('取り消したあとの保有の合計:',tot);ok(tot===9||tot===10,'返却の記録を消すと、引いた台数を保有台数に戻す');
await a.click('button[data-tab=rep]').catch(()=>{});await a.waitForTimeout(600);
const th=await a.evaluate(()=>[...document.querySelectorAll('th')].map(x=>x.textContent).join(','));console.log('見出し:',th.slice(0,200));ok(/返却台数/.test(th),'月ごとの集計に「返却台数」の列が出る');
/* 盛替え業者(搬出業者): 業者を選んで返却を報告すると、その業者の台数から引き、管理者と業者に知らせる */
const cur3=await a.evaluate(()=>window.__FS);cur3.crews={c1:{company:'盛替A',email:'c@x.jp'}};cur3.config.main.vdir=[{id:'a',n:'A社'}];cur3.outbox={};
const c=await open('c1','c@x.jp',true,cur3,'crew-test.html');await c.click('[data-act=rtopen]');await c.waitForTimeout(400);
const opt=await c.locator('#rt-v option').allInnerTexts();console.log('盛替え業者が選べる業者:',opt.join(','));ok(opt.includes('A社'),'盛替え業者の画面にも業者の名前が出る');
const h0=(await fl(c))['10'].h;await c.selectOption('#rt-v','a');await c.waitForTimeout(300);await c.selectOption('#rt-f','10');await c.fill('#rt-u','1');await c.click('[data-act=rtn]');await c.waitForTimeout(600);
const h1=(await fl(c))['10'].h,cob=await c.evaluate(()=>Object.values(window.__FS.outbox||{}).map(o=>o.to));console.log('盛替え業者が返却: 10階',h0,'→',h1,'台 / 知らせ',cob.join(','));
ok(h1===h0-1&&cob.includes('admin')&&cob.includes('vendor'),'盛替え業者も返却を報告でき、管理者と業者に知らせる');
console.log(bad?'NG '+bad+'件':'全部OK');await b.close()})();
