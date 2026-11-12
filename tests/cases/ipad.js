// 画面の幅(iPad縦横・管理者/業者/盛替え)
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');const path=require('path');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const FS={crews:{c1:{company:'揚重社',name:'田中'}},approved:{v1:{company:'搬出業者A',vid:'v1',name:'山田'},v2:{company:'搬出業者B'}},vendors:{v1:{code:'AB12CD',note:'午前中は1台',floors:{38:{h:8,w:5},23:{h:3,w:2},12:{h:4,w:4,same:false,r:20},5:{h:6,w:4}}},v2:{floors:{8:{h:4,w:2}}}},
 orders:{v1:{items:{o1:{f:23,u:2,st:'plan',plan:{d:D(1)},n:'搬出業者A',at:new Date().toISOString()},o2:{f:5,u:1,st:'new',n:'搬出業者A',at:new Date().toISOString()}}}},
 days:{[D(0)]:{cap:8,elev:[1,2],tf:'09:00',tt:'11:00'},[D(1)]:{cap:8,elev:[1]}},confirmed:{[D(0)]:{rows:[{vid:'v1',floor:5,units:4,ev:1,n:'搬出業者A'},{vid:'v1',floor:12,units:4,ev:2,to:10,ret:20,n:'搬出業者A'},{vid:'v2',floor:8,units:2,ev:1,n:'搬出業者B'}]}}};
const sizes=[['iPad Mini',false],['iPad Mini',true],['iPad Pro 11',false],['iPad Pro 11',true],['iPad (gen 7)',false],['iPad (gen 7)',true]];
(async()=>{const b=await chromium.launch();const out=[];
 for(const [dev,land] of sizes){const d=devices[dev];if(!d){console.log('no',dev);continue}
  const vp=land?{width:d.viewport.height,height:d.viewport.width}:d.viewport;
  for(const who of [{uid:'g1',email:'kowa0371@gmail.com',f:'main-test.html'},{uid:'v1',email:'a@x.jp',f:'main-test.html'},{uid:'c1',email:'c@x.jp',f:'crew-test.html'}]){
   const ctx=await b.newContext({...d,viewport:vp});await ctx.addInitScript(()=>{try{if(!localStorage.getItem('nr-uipref'))localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});/*FULLVIEW*/
   await ctx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
   await ctx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
   await ctx.addInitScript(w=>{window.__FAKE_UID=w.who.uid;window.__FAKE_EMAIL=w.who.email;window.__FS=w.FS},{who,FS});
   const p=await ctx.newPage();await p.goto('file://'+path.resolve(who.f));await p.waitForTimeout(300);await p.click('#lg-google');await p.waitForTimeout(800);
   const tabs=await p.locator('.tabs button').evaluateAll(b=>b.map(x=>x.dataset.tab));
   for(const t of tabs){await p.click(`button[data-tab=${t}]`);await p.waitForTimeout(150);if(t==='cal'){await p.click(`[data-act=sel][data-date="${D(0)}"]`).catch(()=>{});await p.waitForTimeout(150)}
     const r=await p.evaluate(()=>{const W=document.documentElement.clientWidth;const wide=new Set();let inner=[];
       document.querySelectorAll('body *').forEach(e=>{const b=e.getBoundingClientRect();if(b.width&&b.right>W+1&&!e.closest('.tablewrap'))wide.add(e.tagName.toLowerCase()+'.'+(e.className||'').toString().split(' ')[0])});
       document.querySelectorAll('.tablewrap,.floors').forEach(t=>{if(t.scrollWidth>t.clientWidth+1)inner.push((t.className)+':'+t.scrollWidth+'/'+t.clientWidth)});
       return {sw:document.documentElement.scrollWidth,W,wide:[...wide].slice(0,4),inner:inner.slice(0,3)}});
     if(r.sw>r.W||r.wide.length||r.inner.length)out.push(`${dev}${land?'横':'縦'} ${who.uid} ${t} ${JSON.stringify(r)}`);
     if(dev==='iPad Mini'&&who.uid==='v1'&&t==='vin')await p.screenshot({path:`ipad-${land?'l':'p'}-vin.png`});
     if(dev==='iPad Mini'&&who.uid==='g1'&&t==='cal')await p.screenshot({path:`ipad-${land?'l':'p'}-cal.png`,fullPage:true});
   }
   await ctx.close()}}
 console.log(out.join('\n')||'all fit');await b.close()})();
