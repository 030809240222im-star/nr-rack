// 戻した✅で画面が動かない
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const k=D(0);const rows=[];const vendors={};const approved={};
for(let i=1;i<=8;i++){approved['v'+i]={company:'業者'+i,vid:'v'+i};vendors['v'+i]={floors:{[10+i]:{h:6,w:4}}};rows.push({vid:'v'+i,floor:10+i,units:2,ev:1})}
const FS={config:{main:{evn:2}},approved,crews:{c1:{company:'盛替A',email:'c@x.jp'}},vendors,days:{[k]:{cap:16,elev:[1]}},confirmed:{[k]:{rows}}};
(async()=>{const b=await chromium.launch();
for(const tab of ['cal','ret']){
const cx=await b.newContext({...devices['iPhone 13']});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='c1';window.__FAKE_EMAIL='c@x.jp';window.__FS=w},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/crew-test.html');await p.click('#lg-google');await p.waitForTimeout(800);
if(tab==='ret'){await p.click('button[data-tab=ret]');await p.waitForTimeout(300)}
const box=p.locator('input[data-f=back]').nth(5);await box.scrollIntoViewIfNeeded();await p.evaluate(()=>window.scrollBy(0,100));await p.waitForTimeout(200);
const y0=await p.evaluate(()=>scrollY);const t0=await box.boundingBox();
await p.evaluate(()=>{window.__evs=[];['pointerdown','touchstart','change'].forEach(t=>document.addEventListener(t,e=>window.__evs.push(t),true))});await box.tap();console.log(' evs',await p.evaluate(()=>window.__evs.join(',')));await p.waitForTimeout(800);
const y1=await p.evaluate(()=>scrollY);const t1=await p.locator('input[data-f=back]').nth(5).boundingBox();console.log(' box top',Math.round(t0.y),'->',Math.round(t1.y),'same row checked?',await p.locator('input[data-f=back]').nth(5).isChecked());
console.log(tab,'scrollY',y0,'->',y1,'checked boxes',await p.locator('input[data-f=back]:checked').count(),'msg',(await p.locator('.note').first().innerText().catch(()=>'')).slice(0,40));
const S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));console.log(' vendor v6 floors',JSON.stringify(S.vendors.v6.floors));
await cx.close()}
await b.close()})();
