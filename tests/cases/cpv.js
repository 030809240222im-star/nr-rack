// 管理者が「盛替え業者ページを確認」「業者ページを確認」で、それぞれの画面を見られる。操作すると「管理者(代理)」と残る
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()-6*36e5+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const t=D(0);
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:'',auto:0}},approved:{a:{company:'A社',vid:'a'}},crews:{c1:{company:'盛替A',email:'c@x.jp',name:'佐藤'},c2:{company:'盛替B',email:'d@x.jp'}},
  vendors:{a:{floors:{10:{h:6,w:4}}}},days:{[t]:{cap:8,elev:[1]}},
  confirmed:{[t]:{rows:[{vid:'a',floor:10,units:3,ev:1,n:'A社'}],vids:['a'],at:'2026-01-01T00:00:00Z',hist:[]}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
for(const simple of [false,true]){
  const cx=await b.newContext({viewport:{width:1200,height:900}});await cx.addInitScript(s=>{try{localStorage.setItem('nr-uipref',JSON.stringify({simple:s}))}catch(e){}},simple);
  await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
  await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';if(!sessionStorage.__FS)sessionStorage.__FS=JSON.stringify(w)},FS);
  const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(800);
  const L=simple?'(簡単表示)':'(詳しい表示)';
  ok(await p.locator('[data-act=cpvon]').count()===1&&await p.locator('[data-act=pvon]').count()===1,'管理者の画面に「業者ページを確認」と「盛替え業者ページを確認」が出る'+L);
  await p.click('[data-act=cpvon]');await p.waitForTimeout(500);
  const body=await p.locator('body').innerText();
  ok(/盛替え業者ページのプレビュー/.test(body)&&/揃っている|搬出予定/.test(body),'盛替え業者の画面が出る'+L);
  const opts=await p.locator('#cpvsel option').allInnerTexts();ok(opts.length===2,'表示する盛替え業者を選べる('+opts.join('・')+')'+L);
  if(!simple){await p.click('button[data-tab=cal]').catch(()=>{});await p.waitForTimeout(300)}
  const chk=p.locator('[data-act=chk][data-k=ok]').first();
  if(await chk.count()){await chk.click();await p.waitForTimeout(500);const st=await p.evaluate(t=>{const c=window.__FS.confirmed[t];return JSON.stringify(c.st||c.rows[0].chk||{})},t);console.log('確認の記録:',st.slice(0,160));ok(/代理/.test(st),'プレビューで操作すると「管理者(代理)」と残る'+L)}
  else ok(false,'盛替え業者の「揃っている」ボタンが出る'+L);
  await p.click('[data-act=pvoff]');await p.waitForTimeout(400);ok(!/プレビュー/.test(await p.locator('body').innerText())&&await p.locator('[data-act=cpvon]').count()===1,'「管理画面に戻る」で管理者の画面に戻る'+L);
  await p.click('[data-act=pvon]');await p.waitForTimeout(400);ok(/業者ページのプレビュー/.test(await p.locator('body').innerText()),'業者ページのプレビューも今までどおり出る'+L);
  await cx.close();
}
console.log(bad?'NG '+bad+'件':'全部OK');await b.close()})();
