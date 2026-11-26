// どのページでも、下までスクロールしたとき上のタブが画面の上に残り、すぐ他のページへ移れる(管理者・業者・盛替え業者、詳しい表示と簡単表示)
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()-6*36e5+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const t=D(0);
const fl={};for(let f=2;f<=30;f++)fl[f]={h:3,w:1};
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:'',auto:0}},approved:{a:{company:'A社',vid:'a'}},crews:{c1:{company:'盛替A',email:'c@x.jp'}},
  vendors:{a:{floors:fl}},days:{[t]:{cap:8,elev:[1]}},
  confirmed:{[t]:{rows:[{vid:'a',floor:10,units:3,ev:1,n:'A社'}],vids:['a'],at:'2026-01-01T00:00:00Z',hist:[]}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
for(const simple of [false,true]){
  const cx=await b.newContext({viewport:{width:390,height:700}});await cx.addInitScript(s=>{try{localStorage.setItem('nr-uipref',JSON.stringify({simple:s}))}catch(e){}},simple);
  await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
  await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';if(!sessionStorage.__FS)sessionStorage.__FS=JSON.stringify(w)},FS);
  const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(800);
  for(const who of ['管理者','業者','盛替え業者']){
    if(who==='業者'){await p.click('[data-act=pvon]');await p.waitForTimeout(500)}
    if(who==='盛替え業者'){await p.click('[data-act=pvoff]');await p.waitForTimeout(400);await p.click('[data-act=cpvon]');await p.waitForTimeout(500)}
    const L='('+who+(simple?'・簡単表示':'・詳しい表示')+')';
    const tabs=await p.locator('#tabbar .tabs button').evaluateAll(x=>x.map(e=>e.dataset.tab));
    if(!tabs.length){console.log('  タブのない1ページの表示'+L);continue}
    let long=0,stuck=0,moved=0;
    for(let i=0;i<tabs.length;i++){
      await p.click(`#tabbar button[data-tab="${tabs[i]}"]`);await p.waitForTimeout(250);
      const r=await p.evaluate(()=>{window.scrollTo(0,document.documentElement.scrollHeight);const bar=document.getElementById('tabbar').getBoundingClientRect();return {tall:document.documentElement.scrollHeight>innerHeight*1.5,top:bar.top,bottom:bar.bottom,y:scrollY}});
      if(!r.tall)continue;long++;
      if(Math.abs(r.top)<=1&&r.bottom>20)stuck++;else console.log('  残らない:',tabs[i],JSON.stringify(r));
      const nx=tabs[(i+1)%tabs.length];await p.click(`#tabbar button[data-tab="${nx}"]`,{timeout:3000});await p.waitForTimeout(250);
      const sel=await p.evaluate(nx=>document.querySelector(`#tabbar button[data-tab="${nx}"]`).getAttribute('aria-selected'),nx);
      const y=await p.evaluate(()=>{const tp=document.querySelector('#app>.top');return scrollY<=tp.offsetTop+tp.offsetHeight+2});
      if(sel==='true'&&(y||nx==='ret'))moved++;else console.log('  移れない:',tabs[i],'→',nx,sel,y);
    }
    console.log('  タブ',tabs.join(','),'/ 長いページ',long);
    ok(long>0&&stuck===long,'下までスクロールしても上のタブが画面の上に残る'+L);
    ok(long>0&&moved===long,'下までスクロールした所からタブを押すと、そのページの先頭が出る'+L);
  }
  await cx.close();
}
console.log(bad?'NG '+bad+'件':'全部OK');await b.close()})();
