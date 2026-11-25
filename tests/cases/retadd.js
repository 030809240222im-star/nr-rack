// 盛替え業者の「戻し一覧」に、新しいBOXの搬入予定(手配済みの追加注文)が出て、ここから「入れた」を付けられる
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const D=n=>{const d=new Date(Date.now()-6*36e5+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const at='2026-01-01T00:00:00Z';
const FS={config:{main:{evn:2,ev:{1:[1,40],2:[1,40]},wdFrom:'',auto:0}},crews:{c1:{company:'盛替A',email:'c@x.jp'}},approved:{},
  vendors:{a:{floors:{12:{h:3,w:0}}},b:{floors:{5:{h:1,w:0}}}},days:{[D(1)]:{cap:8,elev:[2]}},
  orders:{a:{items:{o1:{f:12,u:2,st:'plan',plan:{d:D(1),at},n:'A社',at},o2:{f:12,u:1,st:'new',n:'A社',at}}},b:{items:{o3:{f:5,u:4,st:'plan',plan:{d:D(-2),at},n:'B社',at},o4:{f:5,u:1,st:'done',plan:{d:D(-3),at},done:{d:D(-3),ev:1,u:1,at},n:'B社',at}}}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();const cx=await b.newContext({viewport:{width:1200,height:900}});await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='c1';window.__FAKE_EMAIL='c@x.jp';if(!sessionStorage.__FS)sessionStorage.__FS=JSON.stringify(w)},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/crew-test.html');await p.click('#lg-google');await p.waitForTimeout(800);
await p.click('button[data-tab=ret]');await p.waitForTimeout(500);
const sec=await p.locator('section:has-text("新しいBOXの搬入予定")').innerText().catch(()=>'');console.log(sec.replace(/\s+/g,' ').slice(0,300));
ok(/あと2件/.test(sec)&&/A社/.test(sec)&&/B社/.test(sec),'戻し一覧に、手配済みの搬入予定(2件)と入れた分が出る');
ok(!/12階 1台/.test(sec),'まだ手配していない注文は出ない');
ok(/予定日を過ぎています/.test(sec),'予定日を過ぎた分に印が出る');
await p.fill('#cu-a-o1','2');await p.click('[data-act=crewin][data-id=o1]');await p.waitForTimeout(600);
const S=await p.evaluate(()=>window.__FS);console.log('入れたあと: 注文',S.orders.a.items.o1.st,'/ A社12階',S.vendors.a.floors['12'].h,'台');
ok(S.orders.a.items.o1.st==='done'&&S.orders.a.items.o1.done.ev===2&&S.vendors.a.floors['12'].h===5,'「入れた」で注文が済みになり、業者の台数が増える(EVは回収日のEV)');
ok(/あと1件/.test(await p.locator('section:has-text("新しいBOXの搬入予定")').innerText()),'残りの件数が減る');
console.log(bad?'NG '+bad+'件':'全部OK');await b.close()})();
