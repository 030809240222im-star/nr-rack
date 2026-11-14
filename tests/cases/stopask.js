// 担当の曜日の業者が、EVが停まらない階の置き場所を管理者に確認する → 管理者が不停止階タブで指示 → 業者に回答が出る
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const NOW=new Date(2026,10,14,12,0),W='2026-11-18';
const FS={config:{main:{evn:2,ev:{1:[1,40],2:[1,40]},ns:{1:'6'},wd:{t:[3]},wdFrom:''}},approved:{t:{company:'スリーティー',vid:'t',email:'t@x.jp'}},
 vendors:{t:{floors:{6:{h:3,w:3,s:'2026-11-01'},9:{h:2,w:2,s:'2026-11-01'}}}},days:{[W]:{cap:12,elev:[1]}}};
(async()=>{const b=await chromium.launch();
const open=async(uid,email,F,dev,simple)=>{const cx=await b.newContext(dev||{viewport:{width:1100,height:900}});
await cx.addInitScript(s=>{try{localStorage.setItem('nr-uipref',JSON.stringify({simple:s}))}catch(e){}},!!simple);
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID=w.uid;window.__FAKE_EMAIL=w.email;if(!sessionStorage.__FS)window.__FS=w.F},{uid,email,F});
const p=await cx.newPage();await p.clock.setFixedTime(NOW);p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(900);return {cx,p}};
const st=p=>p.evaluate(()=>JSON.parse(sessionStorage.__FS));
// 1) 業者(スマホ・簡単表示): 停まらない階と確認ボタン
let {cx,p}=await open('t','t@x.jp',FS,devices['iPhone 13'],true);
const box=()=>p.locator('.todaybox:has-text("エレベーターが停まらない階")').innerText().then(t=>t.replace(/\s+/g,' ')).catch(()=>'(なし)');
console.log('業者(簡単):',await box());
await p.click('[data-act=stopask]');await p.waitForTimeout(500);console.log(' 押した後:',(await box()).slice(0,80));
let S=await st(p);console.log(' 記録:',JSON.stringify(Object.keys(S.vendors.t.ask||{})),'送信待ち:',JSON.stringify(Object.values(S.outbox||{}).map(x=>x.to+': '+x.msg.slice(0,40))));
console.log(' はみ出し:',await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth));await cx.close();
// 2) 管理者: 今日やること・不停止階タブの印 → 指示
({cx,p}=await open('g1','kowa0371@gmail.com',S,null,false));
await p.click('[data-tab=stg]');await p.waitForTimeout(300);
console.log('管理者 不停止階:',(await p.locator('tr:has-text("スリーティー") td').first().innerText()).replace(/\s+/g,' '));
const mb=p.locator('.mvbox[data-vid="t"][data-fl="6"]');await mb.locator('[data-role=ev]').selectOption('2');await mb.locator('[data-role=to]').fill('6');
await mb.locator('[data-act=stage2]').click();await p.waitForTimeout(500);
S=await st(p);console.log(' 指示後: 確認の記録',JSON.stringify(Object.keys(S.vendors.t.ask||{})),' 業者へのお知らせ:',Object.values((S.notices.t||{}).items||{}).map(x=>x.msg.slice(0,40)).join(' / '));await cx.close();
// 3) 業者(詳しい表示): 回答
({cx,p}=await open('t','t@x.jp',S,null,false));console.log('業者(詳しい):',await box());await cx.close();
// 4) 管理者の今日やること(簡単表示)
({cx,p}=await open('g1','kowa0371@gmail.com',(()=>{const x=JSON.parse(JSON.stringify(FS));x.vendors.t.ask={[W+'|6']:{at:'2026-11-14T03:00:00Z',by:'t',u:3}};return x})(),null,true));
console.log('管理者 今日やること:',(await p.locator('.task').allInnerTexts()).filter(t=>/置き場所/.test(t)).map(t=>t.replace(/\s+/g,' ')).join(''));await cx.close();
await b.close()})();
