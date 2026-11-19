// 業者の変更が「反映されない」を防ぐ: 台数の画面で確定した日の変え方を案内、保存できなかったら通知を送らずにはっきり伝える、12:00を過ぎたら理由を出す
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const W='2026-11-20';
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:''}},approved:{v1:{company:'サンオキ',vid:'v1',email:'a@x.jp'}},
 vendors:{v1:{floors:{16:{h:6,w:4,s:'2026-11-01'},20:{h:5,w:2,s:'2026-11-01'}}}},days:{[W]:{cap:8,elev:[1]}},
 confirmed:{[W]:{rows:[{vid:'v1',floor:16,units:4,ev:1,to:null,ret:null,n:'サンオキ'}],vids:['v1'],hist:[]}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
const open=async(now,deny,simple)=>{const cx=await b.newContext(devices['iPhone 13']);
await cx.addInitScript(s=>{try{localStorage.setItem('nr-uipref',JSON.stringify({simple:s}))}catch(e){}},simple);
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='v1';window.__FAKE_EMAIL='a@x.jp';if(!sessionStorage.__FS)window.__FS=w.F;window.__FAKE_DENY=w.deny},{F:FS,deny});
const p=await cx.newPage();await p.clock.setFixedTime(now);p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(900);return {cx,p}};
const txt=async(p,sel)=>(await p.locator(sel).first().innerText().catch(()=>'(なし)')).replace(/\s+/g,' ');
// 1) 簡単表示の「台数」画面: 確定した日は、ここで変えても変わらないと案内し、変える画面へ移れる
let {cx,p}=await open(new Date(2026,10,19,15,0),[],true);
await p.click('[data-act=stab][data-tab="s-count"]');await p.waitForTimeout(300);
const n1=await txt(p,'.vnote');console.log('台数の画面:',n1.slice(0,140));
ok(/確定した回収日の予定は、この画面で台数を変えても変わりません/.test(n1)&&/16階 4台/.test(n1),'台数の画面に、確定した日の予定と案内が出る');
await p.click('[data-act=vchgjump]');await p.waitForTimeout(300);
ok((await p.locator('#vcf-'+W+'-0').count())===1,'「この日の階・台数を変える」で、変える画面が開く');
await cx.close();
// 2) 保存できない(ルールで拒否)ときは、通知を送らず、保存できなかったと出る。画面は元の予定に戻る
({cx,p}=await open(new Date(2026,10,19,15,0),['confirmed'],true));
await p.click('[data-act=vchgopen]');await p.waitForTimeout(200);
await p.fill('#vcf-'+W+'-0','20');await p.locator('#vcf-'+W+'-0').blur();await p.waitForTimeout(200);
await p.fill('#vcu-'+W+'-0','2');await p.locator('#vcu-'+W+'-0').blur();await p.waitForTimeout(200);
await p.click('[data-act=vchsave]');await p.waitForTimeout(1200);
const m2=await txt(p,'.note.bad');console.log(' 拒否されたとき:',m2.slice(0,120));
const S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS||'{}'));const ob=Object.values(S.outbox||{}).filter(x=>x.to==='crew'||x.to==='admin');
ok(/変更を保存できませんでした\(permission-denied\)/.test(m2)&&ob.length===0,'保存できなかったら、管理者・盛替え業者に通知は送らない');
console.log(' 次に出す日:',(await txt(p,'.todo')).slice(0,60));ok(/16階/.test(await txt(p,'.todo'))&&!/20階/.test(await txt(p,'.todo')),'画面は元の予定(16階)に戻る');
await cx.close();
// 3) 当日12:00を過ぎたら、変えられない理由が出る
({cx,p}=await open(new Date(2026,10,20,12,30),[],true));
const m3=await txt(p,'section.simple');ok(/12:00を過ぎたので変えられません/.test(m3)&&(await p.locator('.vchg').count())===0,'当日12:00を過ぎたら「12:00を過ぎたので変えられません」と出る');
await cx.close();
// 4) 詳しい表示の「業者入力」にも案内
({cx,p}=await open(new Date(2026,10,19,15,0),[],false));
await p.click('button[data-tab=vin]').catch(()=>{});await p.waitForTimeout(300);
ok(/確定した回収日の予定は/.test(await txt(p,'.vnote')),'詳しい表示の入力画面にも案内が出る');
console.log(' はみ出し:',await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth));
await cx.close();
await b.close();console.log(bad?'NG '+bad+'件':'すべてOK');if(bad)process.exit(1)})();
