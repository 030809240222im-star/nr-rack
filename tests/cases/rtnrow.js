// 搬出したNRボックスを、戻さずにそのまま返却する: 回収した階の台数を引くだけで、戻し階には足さない。取り消すと元に戻る
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const D=n=>{const d=new Date(Date.now()-6*36e5+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const t=D(0);
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:'',auto:0,vdir:[{id:'a',n:'A社'}]}},approved:{a:{company:'A社',vid:'a'}},crews:{c1:{company:'盛替A',email:'c@x.jp'}},
  vendors:{a:{floors:{10:{h:6,w:4},11:{h:1,w:0}}}},days:{[t]:{cap:8,elev:[1]}},
  confirmed:{[t]:{rows:[{vid:'a',floor:10,units:3,ev:1,ret:11,n:'A社',chk:{k:'ok',at:'2026-01-01T00:00:00Z',by:'x'}}],vids:['a'],at:'2026-01-01T00:00:00Z',hist:[]}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
const open=async(uid,email,simple,fsx,file)=>{const cx=await b.newContext({viewport:{width:1200,height:900}});await cx.addInitScript(s=>{try{localStorage.setItem('nr-uipref',JSON.stringify({simple:s}))}catch(e){}},simple);
  await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
  await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
  await cx.addInitScript(([w,u,e])=>{window.__FAKE_UID=u;window.__FAKE_EMAIL=e;if(!sessionStorage.__FS)sessionStorage.__FS=JSON.stringify(w)},[fsx,uid,email]);
  const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/'+(file||'main-test.html'));await p.click('#lg-google');await p.waitForTimeout(1000);return p};
const fl=p=>p.evaluate(()=>window.__FS.vendors.a.floors);
/* 盛替え業者(簡単な表示): 「戻さずに返却する」を2回押す */
const c=await open('c1','c@x.jp',true,FS,'crew-test.html');
const btn=c.locator('[data-act=brtn]').first();console.log('ボタン:',await btn.innerText().catch(()=>'なし'));
await btn.click();await c.waitForTimeout(300);console.log('1回目:',await c.locator('[data-act=brtn]').first().innerText().catch(()=>''));
await c.locator('[data-act=brtn]').first().click();await c.waitForTimeout(600);
let f=await fl(c);console.log('返却後:',JSON.stringify(f));ok(f['10'].h===3&&f['10'].w===1&&f['11'].h===1,'回収した10階から3台引き(6→3、出したい4→1)、戻し階の11階は増えない');
const bk=await c.evaluate(t=>window.__FS.confirmed[t].rows[0].back,t);ok(bk&&bk.rtn&&bk.u===3,'行に「返却(戻さず)」として残る');
const ob=await c.evaluate(()=>Object.values(window.__FS.outbox||{}).map(o=>o.to+':'+o.msg));console.log('知らせ:',ob.join(' / '));ok(ob.some(x=>/戻さずにそのまま返却/.test(x)),'管理者に知らせる');
ok(/戻さずに返却しました/.test(await c.locator('body').innerText()),'画面に「戻さずに返却しました」と出る');
/* 取り消す */
await c.click('[data-act=sback]');await c.waitForTimeout(600);f=await fl(c);ok(f['10'].h===6&&f['10'].w===4&&f['11'].h===1,'取り消すと台数が元に戻る');
/* もう一度返却して、管理者の記録・集計を見る */
await c.locator('[data-act=brtn]').first().click();await c.waitForTimeout(200);await c.locator('[data-act=brtn]').first().click();await c.waitForTimeout(600);
const cur=await c.evaluate(()=>window.__FS);
const a=await open('g1','kowa0371@gmail.com',false,cur);await a.click('button[data-tab=rec]');await a.waitForTimeout(600);
const rec=await a.locator('tr:has(.st.bad:has-text("返却"))').first().innerText().catch(()=>'');console.log('管理者の記録:',rec.replace(/\s+/g,' '));ok(/戻さずに返却/.test(rec),'管理者の記録に「返却」として出る');
await a.click('button[data-tab=rep]');await a.waitForTimeout(500);
const row=await a.locator('table.rtable tbody tr').first().innerText().catch(()=>'');console.log('集計の行:',row.replace(/\s+/g,' '));
ok(/A社/.test(row),'集計に出る');
console.log(bad?'NG '+bad+'件':'全部OK');await b.close()})();
