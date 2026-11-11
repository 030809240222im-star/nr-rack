// 盛替え業者の登録と操作
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');const path=require('path');
fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const t=D(0);
let FS={approved:{v1:{company:'A社'},v2:{company:'B社'}},vendors:{v1:{name:'A社',floors:{5:{h:6,w:4}}},v2:{floors:{8:{h:3,w:3}}}},
 days:{[t]:{cap:8,elev:[1],tf:'08:00'}},confirmed:{[t]:{rows:[{vid:'v1',floor:5,units:4,ev:1,n:'A社'},{vid:'v2',floor:8,units:3,ev:1,ret:10,n:'B社'}]}}};
async function open(b,who,file){const ctx=await b.newContext({...devices['iPhone 13']});const errs=[];
  await ctx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
  await ctx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
  await ctx.addInitScript(w=>{window.__FAKE_UID=w.who.uid;window.__FAKE_EMAIL=w.who.email;window.__FS=w.FS},{who,FS});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve(file));await p.waitForTimeout(400);
  return {ctx,p,errs,done:async()=>{await p.waitForTimeout(1200);FS=await p.evaluate(()=>JSON.parse(sessionStorage.__FS||'null'))||FS;console.log('  errors',errs);await ctx.close()}};}
(async()=>{const b=await chromium.launch();
  // 1 crew registers
  let s=await open(b,{uid:'c1',email:'crew@x.jp'},'crew-test.html');
  console.log('login h1:',(await s.p.locator('h1').innerText()).replace('\n',' '));
  await s.p.click('#lg-google');await s.p.waitForTimeout(600);
  console.log('crew role before:',await s.p.locator('.role').textContent(),'tabs',await s.p.locator('.tabs button').allInnerTexts());
  await s.p.fill('#reg-company','盛替え社');await s.p.click('[data-act=cregsubmit]');await s.done();
  console.log('crewreq',JSON.stringify(FS.crewreq));
  // 2 admin approves
  s=await open(b,{uid:'g1',email:'kowa0371@gmail.com'},'main-test.html');await s.p.click('#lg-google');await s.p.waitForTimeout(600);
  await s.done();
  console.log('crews',JSON.stringify(FS.crews));
  // 3 crew works
  s=await open(b,{uid:'c1',email:'crew@x.jp'},'crew-test.html');await s.p.click('#lg-google');await s.p.waitForTimeout(800);
  console.log('crew role:',await s.p.locator('.role').textContent(),'tabs',await s.p.locator('.tabs button').allInnerTexts());
  console.log('today box:',(await s.p.locator('.todaybox').first().innerText()).replace(/\n/g,' | '));
  await s.p.click('[data-act=chk][data-k=ok][data-i="0"]');await s.p.waitForTimeout(300);
  await s.p.fill('#ck-'+t+'-1','1');await s.p.click('[data-act=chk][data-k=short][data-i="1"]');await s.p.waitForTimeout(600);
  console.log('alert box:',(await s.p.locator('.todaybox.alert').innerText().catch(()=>'none')).replace(/\n/g,' | '));
  await s.p.click('button[data-tab=ret]');await s.p.waitForTimeout(200);
  console.log('ret table:\n'+(await s.p.locator('table').first().innerText()));
  await s.p.check('input[data-f=back] >> nth=0');await s.p.waitForTimeout(400);
  await s.p.screenshot({path:'crew.png',fullPage:true});await s.done();
  console.log('rows',JSON.stringify(FS.confirmed[t].rows.map(r=>({f:r.floor,chk:r.chk&&r.chk.k,got:r.chk&&r.chk.got,back:r.back&&r.back.u,n:r.n}))));
  console.log('vendors',JSON.stringify({v1:FS.vendors.v1.floors,v2:FS.vendors.v2.floors}));
  // 4 vendor B sees alert
  FS.confirmed[t].rows[1].back=undefined;delete FS.confirmed[t].rows[1].back;
  s=await open(b,{uid:'v2',email:'b@x.jp'},'main-test.html');await s.p.click('#lg-google');await s.p.waitForTimeout(800);
  console.log('vendor B alert:',(await s.p.locator('.todaybox.alert').innerText().catch(()=>'none')).replace(/\n/g,' | '));
  await s.done();
  await b.close()})();
