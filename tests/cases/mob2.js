// スマホ幅
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');const path=require('path');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const FS={approved:{v1:{company:'搬出業者A'}},vendors:{v1:{floors:{38:{h:8,w:5},23:{h:3,w:2},12:{h:4,w:4,same:false,r:20},5:{h:6,w:4}}}},
 orders:{v1:{items:{o1:{f:23,u:2,st:'plan',plan:{d:D(1)},at:new Date().toISOString()},o2:{f:5,u:1,st:'new'}}}},
 days:{[D(0)]:{cap:8,elev:[1,2]}},confirmed:{[D(0)]:{rows:[{vid:'v1',floor:5,units:4,ev:1,n:'搬出業者A'},{vid:'v1',floor:12,units:4,ev:2,to:10,ret:20,n:'搬出業者A'}]}}};
(async()=>{const b=await chromium.launch();
 for(const who of [{uid:'v1',email:'a@x.jp'},{uid:'g1',email:'kowa0371@gmail.com'}]){
  const ctx=await b.newContext({...devices['iPhone 13']});await ctx.addInitScript(()=>{try{if(!localStorage.getItem('nr-uipref'))localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});/*FULLVIEW*/const errs=[];
  await ctx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
  await ctx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
  await ctx.addInitScript(w=>{window.__FAKE_UID=w.who.uid;window.__FAKE_EMAIL=w.who.email;window.__FS=w.FS},{who,FS});
  const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file://'+path.resolve('main-test.html'));await p.waitForTimeout(400);await p.click('#lg-google');await p.waitForTimeout(900);
  const tabs=await p.locator('.tabs button').evaluateAll(b=>b.map(x=>x.dataset.tab));
  for(const t of tabs){await p.click(`button[data-tab=${t}]`);await p.waitForTimeout(200);
    if(t==='cal')await p.click(`[data-act=sel][data-date="${D(0)}"]`);await p.waitForTimeout(150);
    const r=await p.evaluate(()=>{const W=document.documentElement.clientWidth;let wide=[];document.querySelectorAll('body *').forEach(e=>{const b=e.getBoundingClientRect();if(b.width&&b.right>W+1&&!e.closest('.tablewrap'))wide.push(e.tagName+'.'+e.className)});return {sw:document.documentElement.scrollWidth,W,wide:[...new Set(wide)].slice(0,4)}});
    console.log(who.uid,t,JSON.stringify(r));
    if(who.uid==='v1'&&t==='vin'){await p.check('#only');await p.waitForTimeout(300);await p.locator('.floors').screenshot({path:'mob-only.png'})}if(who.uid==='v1')await p.screenshot({path:'mob-'+t+'.png',fullPage:true});}
  console.log(' errors',errs);await ctx.close()}
 await b.close()})();
