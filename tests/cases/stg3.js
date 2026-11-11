// 不停止階の集積指示(カレンダー入力・盛替え先)
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');const path=require('path');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const k1=D(6),k2=D(7);
const FS={config:{main:{evn:2,ev:{1:[1,30],2:[31,60]},ns:{2:'44-46'}}},approved:{v1:{company:'サンオキ',vid:'v1',name:'山田'},v2:{company:'日本建工',vid:'v2'}},
 vendors:{v1:{floors:{45:{h:4,w:4,s:'2026-11-01'},10:{h:2,w:2,s:'2026-11-01'},62:{h:3,w:3,s:'2026-11-05'}}},v2:{floors:{44:{h:5,w:2,s:'2026-11-08'}}}},days:{[k1]:{cap:8,elev:[1,2]},[k2]:{cap:8,elev:[1]}}};
(async()=>{const b=await chromium.launch();
for(const [n,dev] of [['pc',{viewport:{width:1280,height:1000}}],['ph',devices['iPhone 13']]]){
const cx=await b.newContext(dev);
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';window.__FS=w},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+path.resolve('main-test.html'));await p.click('#lg-google');await p.waitForTimeout(800);
console.log(n,'tab:',(await p.locator('button[data-tab=stg]').innerText()).replace(/\n/g,''));
await p.click('button[data-tab=stg]');await p.waitForTimeout(300);
const rows=await p.locator('table.rtable tbody tr').allInnerTexts();console.log(' rows:',rows.map(x=>x.replace(/\s+/g,' ').slice(0,70)));
if(n==='pc'){
 // instruct v1 45F (row with 45階): choose EV1 floor 30 on k1
 const idx=rows.findIndex(x=>x.includes('45階'));
 console.log(' default ev/to for 45F:',await p.locator('#sg2-e-'+idx).inputValue(),await p.locator('#sg2-t-'+idx).inputValue());
 console.log(' date input type:',await p.locator('#sg2-d-'+idx).getAttribute('type'),await p.locator('#sg2-d-'+idx).inputValue());
 await p.selectOption('#sg2-e-'+idx,'2');console.log(' to after EV2:',await p.locator('#sg2-t-'+idx).inputValue());
 await p.selectOption('#sg2-e-'+idx,'1');console.log(' to after EV1:',await p.locator('#sg2-t-'+idx).inputValue());
 await p.fill('#sg2-d-'+idx,k2);await p.fill('#sg2-t-'+idx,'30');await p.locator('#sg2-t-'+idx).blur();
 await p.locator('[data-act=stage2]').nth(idx).click();await p.waitForTimeout(400);
 const S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));console.log(' msg:',(await p.locator('.note').first().innerText()).slice(0,120));console.log(' moves saved:',JSON.stringify(S.days[k1].moves||S.days[k2].moves));
 console.log(' tab after:',(await p.locator('button[data-tab=stg]').innerText()).replace(/\n/g,''),'| current:',(await p.locator('table.rtable tbody tr').first().innerText()).replace(/\s+/g,' ').slice(0,120));
 await p.click('button[data-tab=cal]');await p.click(`[data-act=sel][data-date="${k1}"]`);await p.waitForTimeout(300);
 console.log(' day panel assign:',(await p.locator('.panel table tbody tr').allInnerTexts()).slice(0,4).map(x=>x.replace(/\s+/g,' ')).join(' / '));
 await p.click('button[data-tab=stg]');await p.waitForTimeout(200);await p.fill('#sg2-d-0','2020-01-01');await p.waitForTimeout(300);
 console.log(' after unstage tab:',(await p.locator('button[data-tab=stg]').innerText()).replace(/\n/g,''));
}
console.log(' sw',await p.evaluate(()=>document.documentElement.scrollWidth));
await p.screenshot({path:WORK+'/stg3-'+n+'.png',fullPage:true});await cx.close()}
await b.close()})();
