// 確定後の業者による変更: 回収日の12:00まで、業者が自社の階・台数を変えられる。停まらない階はNG。管理者と盛替え業者に通知。管理者も不停止階はNG
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const W='2026-11-18';
const FS={config:{main:{evn:2,ev:{1:[1,40],2:[1,40]},ns:{1:'6'},wdFrom:''}},approved:{v1:{company:'サンオキ',vid:'v1',email:'a@x.jp'},v2:{company:'日本建工',vid:'v2',email:'b@x.jp'}},
 vendors:{v1:{floors:{16:{h:6,w:4,s:'2026-11-01'},6:{h:3,w:3,s:'2026-11-01'},20:{h:5,w:2,s:'2026-11-01'}}},v2:{floors:{19:{h:4,w:2,s:'2026-11-01'}}}},
 days:{[W]:{cap:8,elev:[1]}},
 confirmed:{[W]:{rows:[{vid:'v1',floor:16,units:4,ev:1,to:null,ret:null,n:'サンオキ'},{vid:'v2',floor:19,units:2,ev:1,to:null,ret:null,n:'日本建工'}],vids:['v1','v2'],hist:[]}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
const open=async(uid,email,F,now,dev,simple)=>{const cx=await b.newContext(dev||{viewport:{width:1100,height:900}});
await cx.addInitScript(s=>{try{localStorage.setItem('nr-uipref',JSON.stringify({simple:s}))}catch(e){}},!!simple);
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID=w.uid;window.__FAKE_EMAIL=w.email;if(!sessionStorage.__FS)window.__FS=w.F},{uid,email,F});
const p=await cx.newPage();await p.clock.setFixedTime(now);p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(900);return {cx,p}};
const st=p=>p.evaluate(()=>JSON.parse(sessionStorage.__FS));
const txt=async(p,sel)=>(await p.locator(sel).first().innerText().catch(()=>'(なし)')).replace(/\s+/g,' ');
// 1) 業者(スマホ・簡単表示)、回収日の前日: 変えるカード → 6階(EV1が停まらない)はNG
let {cx,p}=await open('v1','a@x.jp',FS,new Date(2026,10,17,15,0),devices['iPhone 13'],true);
console.log('カード:',await txt(p,'.vchg'));ok((await p.locator('.vchg').count())===1,'業者の画面に「搬出を変える」が出る');
await p.click('[data-act=vchgopen]');await p.waitForTimeout(300);
await p.fill('#vcf-'+W+'-0','6');await p.locator('#vcf-'+W+'-0').blur();await p.waitForTimeout(300);
const ng=await txt(p,'.vchg .vng');console.log(' 6階:',ng);
ok(/NG: 6階は、この日のエレベーター\(EV1\)が停まらない階/.test(ng)&&await p.locator('[data-act=vchsave]').isDisabled(),'不停止階(6階)はNGが出て、「変えて通知する」は押せない');
console.log(' はみ出し:',await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth));
// 20階 2台 + 16階 2台 に変える
await p.fill('#vcf-'+W+'-0','20');await p.locator('#vcf-'+W+'-0').blur();await p.waitForTimeout(200);
await p.fill('#vcu-'+W+'-0','2');await p.locator('#vcu-'+W+'-0').blur();await p.waitForTimeout(200);
await p.click('[data-act=vchadd]');await p.waitForTimeout(200);
await p.fill('#vcf-'+W+'-1','16');await p.locator('#vcf-'+W+'-1').blur();await p.waitForTimeout(200);
await p.fill('#vcu-'+W+'-1','9');await p.locator('#vcu-'+W+'-1').blur();await p.waitForTimeout(200);
console.log(' 9台:',await txt(p,'.vchg .vng'));ok(await p.locator('[data-act=vchsave]').isDisabled(),'保有より多い台数もNG');
await p.fill('#vcu-'+W+'-1','2');await p.locator('#vcu-'+W+'-1').blur();await p.waitForTimeout(200);
// 戻し階(−/＋の数字の欄): どのEVも停まらない45階はNG。「戻し先を分ける」で18階に1台・残りは20階(同じ階)
ok((await p.locator('#vcrf-'+W+'-0-0').getAttribute('type'))==='number'&&(await p.locator('#vcrf-'+W+'-0-0').locator('xpath=..').locator('.stp').count())===2,'戻し階も −/＋ の数字の欄');
await p.fill('#vcrf-'+W+'-0-0','45');await p.locator('#vcrf-'+W+'-0-0').blur();await p.waitForTimeout(200);
const rng=await txt(p,'.vchg .vng');console.log(' 戻し45階:',rng);ok(/NG: 45階は、どのエレベーターも停まらない/.test(rng)&&await p.locator('[data-act=vchsave]').isDisabled(),'戻し階にどのEVも停まらない階はNG');
await p.fill('#vcrf-'+W+'-0-0','20');await p.locator('#vcrf-'+W+'-0-0').blur();await p.waitForTimeout(200);
await p.locator('[data-act=vchrsplit][data-i="0"]').click();await p.waitForTimeout(200);
await p.fill('#vcru-'+W+'-0-0','5');await p.locator('#vcru-'+W+'-0-0').blur();await p.waitForTimeout(200);
ok(/出す台数\(2台\)をこえています/.test(await txt(p,'.vchg .vng')),'戻す台数が出す台数より多いとNG');
await p.fill('#vcrf-'+W+'-0-0','18');await p.locator('#vcrf-'+W+'-0-0').blur();await p.waitForTimeout(200);
await p.fill('#vcru-'+W+'-0-0','1');await p.locator('#vcru-'+W+'-0-0').blur();await p.waitForTimeout(200);
const b1=p.locator('#vcrf-'+W+'-1-0');await b1.locator('xpath=..').locator('.stp[data-step="1"]').click();await p.waitForTimeout(900);
ok((await p.locator('#vcrf-'+W+'-1-0').inputValue())==='16','足した階(16階)の空の戻し階で＋を押すと16階から始まる');
console.log(' はみ出し(戻し先を分けた後):',await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth));
await p.screenshot({path:WORK+'/vchg-ret.png'});
await p.click('[data-act=vchsave]');await p.waitForTimeout(1500);
let S=await st(p);const vr=((S.confirmed[W].vr||{}).v1||{}).rows||[];
console.log(' 記録:',JSON.stringify(vr.map(r=>[r.floor,r.units,r.ev])),'履歴:',(S.confirmed[W].hist||[]).map(h=>h.t).join(' / '));
ok(JSON.stringify(vr.map(r=>[r.floor,r.units,r.ev]))==='[[20,2,1],[16,2,1]]','変えた行が自社の分(vr)として保存される');
console.log(' 戻し:',JSON.stringify(vr.map(r=>r.rets||r.ret)));ok(JSON.stringify(vr[0].rets)==='[{"f":18,"u":1},{"f":20,"u":1}]','戻し階「18:1」は18階に1台・残り1台は同じ階で保存される');
const ob=Object.values(S.outbox||{}).map(x=>x.to+': '+x.msg.replace(/\n/g,' '));console.log(' 送信待ち:',JSON.stringify(ob));
ok(ob.some(x=>/^crew: .*搬出予定が変わりました.*サンオキ 20階 2台\(EV1前\) 戻し: 18階 1台・同じ階 1台/.test(x))&&ob.some(x=>/^admin: サンオキが.*搬出を変更しました: 16階 4台\(EV1前\) → 20階 2台/.test(x)),'盛替え業者と管理者に通知が出る');
console.log(' 次に出す日:',(await txt(p,'.todo')).slice(0,120));
ok(/20階.*2台/.test(await txt(p,'.todo')),'業者の「次に出す日」が変えた内容になる');
await cx.close();
// 2) ほかの業者(日本建工)の画面は、日本建工の行だけ
({cx,p}=await open('v2','b@x.jp',S,new Date(2026,10,17,15,0),null,false));
await p.waitForTimeout(300);console.log('日本建工のカード:',await txt(p,'.vchg'));ok(/19階 2台/.test(await txt(p,'.vchg'))&&!/20階/.test(await txt(p,'.vchg')),'ほかの業者のカードには自社の行だけ');await cx.close();
// 3) 管理者: 業者が変更の印、合計、不停止階を追加するとNG、台数を変えると取り込まれる
({cx,p}=await open('g1','kowa0371@gmail.com',S,new Date(2026,10,17,15,0),null,false));
await p.click('[data-tab=cnf]');await p.waitForTimeout(300);
const tb=(await p.locator('.cday').first().innerText()).replace(/\s+/g,' ');console.log('管理者:',tb.slice(0,200));
ok(/サンオキ 業者が変更 20階/.test(tb)&&/6\/8台/.test(tb),'管理者の確定画面に「業者が変更」と変えた行が出る');
const mb=p.locator('.cday').first().locator('.mvbox');await mb.locator('[data-role=to]').selectOption('v1');await mb.locator('[data-role=fl]').fill('6');await mb.locator('[data-role=q]').fill('1');await mb.locator('[data-act=cadd]').click();await p.waitForTimeout(300);
const msg=await txt(p,'.note.bad');console.log(' 管理者が6階を追加:',msg.slice(0,90));ok(/NG: 6階は/.test(msg),'管理者も不停止階はNGで追加できない');
// 管理者が戻し階を指定(19行目の日本建工 19階 → 21階)
await p.fill('#cr-'+W+'-2','21');await p.locator('#cr-'+W+'-2').blur();await p.waitForTimeout(400);
let S3=await st(p);const r3=S3.confirmed[W].rows.find(r=>r.vid==='v2');console.log(' 管理者が戻し階を指定:',JSON.stringify([r3.ret,r3.rets]),Object.values(S3.outbox||{}).filter(x=>x.to==='crew').map(x=>x.msg.replace(/\n/g,' ')).pop());
ok(r3.ret===21&&Object.values(S3.outbox||{}).some(x=>x.to==='crew'&&/日本建工 19階 2台\(EV1前\) 戻し: 21階/.test(x.msg)),'管理者も戻し階を指定でき、盛替え業者に変更後の戻し階が届く');
await p.fill('#cr-'+W+'-2','45');await p.locator('#cr-'+W+'-2').blur();await p.waitForTimeout(300);ok(/NG: 45階/.test(await txt(p,'.note.bad')),'管理者も、どのEVも停まらない戻し階はNG');
await p.fill('#cu-'+W+'-0','3');await p.locator('#cu-'+W+'-0').blur();await p.waitForTimeout(400);
S=await st(p);console.log(' 取り込み後:',JSON.stringify(S.confirmed[W].rows.map(r=>[r.vid,r.floor,r.units])),'vr:',JSON.stringify(S.confirmed[W].vr||{}));
ok(!Object.keys(S.confirmed[W].vr||{}).length&&S.confirmed[W].rows.some(r=>r.vid==='v1'&&r.floor===20&&r.units===3),'管理者が変えると、業者の変更が行に取り込まれる');
await cx.close();
// 4) 回収日の12:00を過ぎたら、業者は変えられない
({cx,p}=await open('v1','a@x.jp',S,new Date(2026,10,18,12,30),null,false));
await p.waitForTimeout(300);ok((await p.locator('.vchg').count())===0,'回収日の12:00を過ぎたら「搬出を変える」は出ない');
await cx.close();
({cx,p}=await open('v1','a@x.jp',S,new Date(2026,10,18,11,30),null,false));
await p.waitForTimeout(300);ok((await p.locator('.vchg').count())===1,'回収日の11:30なら変えられる');
await cx.close();
await b.close();console.log(bad?'NG '+bad+'件':'すべてOK');if(bad)process.exit(1)})();
