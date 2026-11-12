// チェックが読み込み直しで外れない
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const k=D(0);
const FS={config:{main:{evn:2}},approved:{v1:{company:'A',vid:'v1'}},vendors:{v1:{floors:{10:{h:6,w:3},11:{h:0,w:0}}}},days:{[k]:{cap:12,elev:[1]}},confirmed:{[k]:{rows:[{vid:'v1',floor:10,units:3,ev:1}]}}};
(async()=>{const b=await chromium.launch();
async function run(uid,email,fn){const cx=await b.newContext({viewport:{width:1100,height:900}});await cx.addInitScript(()=>{try{if(!localStorage.getItem('nr-uipref'))localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});/*FULLVIEW*/
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID=w.uid;window.__FAKE_EMAIL=w.email;if(!sessionStorage.__FS)window.__FS=w.FS},{uid,email,FS});
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));const url='file://'+WORK+'/main-test.html';
const go=async()=>{await p.goto(url);if(await p.locator('#lg-google').count())await p.click('#lg-google');await p.waitForTimeout(900)};
await go();await fn(p,go);await cx.close()}
// vendor: only checkbox + same + placed
await run('v1','v@x.jp',async(p,go)=>{
  await p.click('button[data-tab=vin]');await p.waitForTimeout(200);
  await p.check('#only');await p.waitForTimeout(300);
  const same=p.locator('input[data-f=same]').first();if(await same.count()){await same.uncheck();await p.waitForTimeout(300)}
  const pl=p.locator('input[data-f=placed]').first();
  await go();await p.click('button[data-tab=vin]');await p.waitForTimeout(300);
  console.log('vendor only after reload:',await p.isChecked('#only'),' same:',await p.locator('input[data-f=same]').first().isChecked().catch(()=>'-'));
  await p.click('button[data-tab=cal]');await p.waitForTimeout(300);
  const pl2=p.locator('input[data-f=placed]').first();console.log(' placed boxes',await pl2.count());
  if(await pl2.count()){await pl2.check();await p.waitForTimeout(400);await go();console.log(' placed after reload:',await p.locator('input[data-f=placed]').first().isChecked())}
});
await run('g1','kowa0371@gmail.com',async(p,go)=>{
  await p.click(`[data-act=sel][data-date="${k}"]`);await p.waitForTimeout(300);
  const bk=p.locator('input[data-f=back]').first();console.log('admin back boxes',await bk.count());
  if(await bk.count()){await bk.check();await p.waitForTimeout(400);await go();await p.click(`[data-act=sel][data-date="${k}"]`);await p.waitForTimeout(300);console.log(' back after reload:',await p.locator('input[data-f=back]').first().isChecked())}
  await p.check('input[data-f=elev][data-e="2"]');await p.waitForTimeout(400);await go();await p.click(`[data-act=sel][data-date="${k}"]`);await p.waitForTimeout(300);console.log(' elev2 after reload:',await p.isChecked('input[data-f=elev][data-e="2"]'));
  await p.click('button[data-tab=map]');await p.check('[data-f=mapOnly]');await p.waitForTimeout(200);await go();await p.click('button[data-tab=map]');await p.waitForTimeout(200);console.log(' mapOnly after reload:',await p.isChecked('[data-f=mapOnly]'));
});
await b.close()})();
