// 盛替え業者: 戻したエレベーターを選ぶ・新しいBOXの搬入に「入れた」
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const k=D(0);
const FS={config:{main:{evn:3}},approved:{v1:{company:'サンユー',vid:'v1'},v2:{company:'日本建工',vid:'v2'}},crews:{c1:{company:'盛替A',email:'c@x.jp'}},
 vendors:{v1:{floors:{17:{h:14,w:10}}},v2:{floors:{25:{h:2,w:0}}}},days:{[k]:{cap:8,elev:[1]}},
 confirmed:{[k]:{rows:[{vid:'v1',floor:17,units:4,ev:1,n:'サンユー',ret:20}]}},
 orders:{v2:{items:{o1:{f:25,u:4,st:'plan',plan:{d:k},n:'日本建工',at:new Date().toISOString()}}}}};
(async()=>{const b=await chromium.launch();const cx=await b.newContext({...devices['iPhone 13']});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='c1';window.__FAKE_EMAIL='c@x.jp';window.__FS=w},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/crew-test.html');await p.click('#lg-google');await p.waitForTimeout(800);
await p.click(`[data-act=sel][data-date="${k}"]`).catch(()=>{});await p.waitForTimeout(300);
console.log('搬入の一覧:',(await p.locator('.addbox').innerText()).replace(/\s+/g,' ').slice(0,120));
await p.selectOption(`#bev-${k}-0`,'2');await p.check(`input[data-f=back][data-d="${k}"]`);await p.waitForTimeout(400);
let S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));
console.log('戻したEV:',JSON.stringify(S.confirmed[k].st),' 業者の台数:',JSON.stringify(S.vendors.v1.floors));
await p.selectOption('#ce-v2-o1','3');await p.click('[data-act=crewin]');await p.waitForTimeout(400);
S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));
console.log('入れた:',JSON.stringify(S.orders.v2.items.o1.done),' 25階:',JSON.stringify(S.vendors.v2.floors['25']),' 記録:',JSON.stringify((S.plans||{}).v2&&S.plans.v2.logs.length));
console.log('表示:',(await p.locator('.addbox').innerText()).replace(/\s+/g,' ').slice(0,100));
console.log('sw',await p.evaluate(()=>document.documentElement.scrollWidth));
await b.close()})();
