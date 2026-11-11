// 空きを逼迫した業者に回す
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');const path=require('path');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const k=D(1);
const S0={config:{},approved:{v1:{company:'サンオキ',vid:'v1'},v2:{company:'日本建工',vid:'v2'},v3:{company:'トップライズ',vid:'v3'}},
 vendors:{v1:{floors:{16:{h:6,w:6,s:'2026-11-01'}}},v2:{floors:{19:{h:5,w:3,s:'2026-11-09'}}},v3:{floors:{15:{h:4,w:4,s:'2026-11-05'},20:{h:6,w:1,s:'2026-11-10'}}}},
 days:{[k]:{cap:8,elev:[1]},[D(8)]:{cap:8,elev:[1]}},
 confirmed:{[k]:{rows:[{vid:'v1',floor:16,units:6,ev:1,n:'サンオキ'},{vid:'v2',floor:19,units:2,ev:1,n:'日本建工'}]}}};
(async()=>{const b=await chromium.launch();
async function mk(S,dev){const cx=await b.newContext(dev||{viewport:{width:1280,height:1100}});
 await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
 await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
 await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';window.__FS=w},S);
 const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,200))});await p.goto('file://'+path.resolve('main-test.html'));await p.click('#lg-google');await p.waitForTimeout(800);return [p,cx]}
// full day -> no prompt? cap 8, used 8
let [p,cx]=await mk(S0);await p.click('button[data-tab=cnf]');await p.waitForTimeout(300);console.log('full day prompt:',await p.locator('.fillbox').count());
// delete v1 row partly -> reduce units to 3 -> free 5
await p.fill(`#cu-${k}-0`,'3');await p.locator(`#cu-${k}-0`).blur();await p.waitForTimeout(400);
console.log('prompt:',(await p.locator('.fillbox').first().innerText()).replace(/\s+/g,' ').slice(0,200));
await p.screenshot({path:WORK+'/fill1.png'});
// YES: auto
await p.click('[data-act=fillauto]');await p.waitForTimeout(500);
const S1=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));
console.log('auto rows:',JSON.stringify(S1.confirmed[k].rows.map(r=>[r.n||r.vid,r.floor,r.units])));
console.log('notices:',JSON.stringify(Object.entries(S1.notices||{}).map(([v,n])=>[v,Object.values(n.items).map(i=>i.msg.slice(0,40))])));
console.log('msg:',(await p.locator('.note.ok').first().innerText().catch(()=>'')).slice(0,100));
await cx.close();
// NO: manual
let [p2,cx2]=await mk(S0);await p2.click('button[data-tab=cnf]');await p2.fill(`#cu-${k}-0`,'3');await p2.locator(`#cu-${k}-0`).blur();await p2.waitForTimeout(400);
await p2.click('[data-act=fillman]');await p2.waitForTimeout(300);
console.log('manual table:',(await p2.locator('.fillbox tbody tr').allInnerTexts()).map(x=>x.replace(/\s+/g,' ')));
await p2.screenshot({path:WORK+'/fill2.png'});
await p2.check('#fc-'+k+'-1');await p2.fill('#fq-'+k+'-1','2');await p2.click('[data-act=fillgo]');await p2.waitForTimeout(500);
const S2=await p2.evaluate(()=>JSON.parse(sessionStorage.__FS));
console.log('manual rows:',JSON.stringify(S2.confirmed[k].rows.map(r=>[r.n||r.vid,r.floor,r.units])));
console.log('notified vendors:',Object.keys(S2.notices||{}));
await b.close()})();
