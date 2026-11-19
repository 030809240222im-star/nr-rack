// 業者が戻し階を入れても、ほかの階の戻し階が消えないこと(業者入力・確定後の「搬出を変える」)
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const W='2026-11-20';
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:''}},approved:{v1:{company:'サンオキ',vid:'v1',email:'a@x.jp'}},
 vendors:{v1:{floors:{16:{h:6,w:4,s:'2026-11-01',same:false,rs:[{f:18,u:4}]},20:{h:5,w:2,s:'2026-11-01',same:false,rs:[{f:22,u:2}]},25:{h:4,w:2,s:'2026-11-01'}}}},days:{[W]:{cap:8,elev:[1]}},
 confirmed:{[W]:{rows:[{vid:'v1',floor:16,units:4,ev:1,to:null,ret:18,n:'サンオキ'},{vid:'v1',floor:20,units:2,ev:1,to:null,ret:22,n:'サンオキ'}],vids:['v1'],hist:[]}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
const open=async(simple)=>{const cx=await b.newContext(devices['iPhone 13']);
await cx.addInitScript(s=>{try{localStorage.setItem('nr-uipref',JSON.stringify({simple:s}))}catch(e){}},simple);
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='v1';window.__FAKE_EMAIL='a@x.jp';if(!sessionStorage.__FS)window.__FS=w},FS);
const p=await cx.newPage();await p.clock.setFixedTime(new Date(2026,10,19,15,0));p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(900);return {cx,p}};
const st=p=>p.evaluate(()=>JSON.parse(sessionStorage.__FS||'{}'));
// 1) 業者入力(詳しい表示): 25階の戻し階を入れても、16階・20階の戻し階は残る
let {cx,p}=await open(false);
await p.click('button[data-tab=vin]');await p.waitForTimeout(400);
await p.locator('#s-25').uncheck();await p.waitForTimeout(500);
await p.fill('#rf-25-0','30');await p.locator('#rf-25-0').blur();await p.waitForTimeout(600);
let S=await st(p),fl=S.vendors.v1.floors;console.log('業者入力のあと:',JSON.stringify({16:fl[16].rs,20:fl[20].rs,25:fl[25].rs}));
ok(JSON.stringify(fl[16].rs)==='[{"f":18,"u":4}]'&&JSON.stringify(fl[20].rs)==='[{"f":22,"u":2}]'&&fl[25].rs&&fl[25].rs[0].f===30,'業者入力: 25階の戻し階を入れても16階・20階の戻し階は残る');
// ＋ボタンで続けて別の階
await p.locator('#rf-16-0').locator('xpath=..').locator('.stp[data-step="1"]').click();await p.waitForTimeout(200);
await p.locator('#rf-20-0').locator('xpath=..').locator('.stp[data-step="1"]').click();await p.waitForTimeout(1500);
S=await st(p);fl=S.vendors.v1.floors;console.log(' ＋を続けて押したあと:',JSON.stringify({16:fl[16].rs,20:fl[20].rs,25:fl[25].rs}));
ok(fl[16].rs[0].f===19&&fl[20].rs[0].f===23&&fl[25].rs[0].f===30,'業者入力: 続けて別の階の＋を押しても、どちらも残る');
await cx.close();
// 2) 確定後の「搬出を変える」: 16階の戻し階を変えても、20階の戻し階(22階)は残る
({cx,p}=await open(true));
await p.click('[data-act=vchgopen]');await p.waitForTimeout(300);
const o0=await p.locator('#vcrf-'+W+'-0-0').inputValue(),o1=await p.locator('#vcrf-'+W+'-1-0').inputValue();console.log('開いたとき:',o0,o1);
ok(o0==='18'&&o1==='22','搬出を変える: 開いたときに、今の戻し階(16階→18階・20階→22階)が入っている');
await p.fill('#vcrf-'+W+'-0-0','17');await p.locator('#vcrf-'+W+'-0-0').blur();await p.waitForTimeout(400);
const a1=await p.locator('#vcrf-'+W+'-1-0').inputValue();console.log(' 16階を17にしたあと 20階の欄:',a1);ok(a1==='22','搬出を変える: 16階の戻し階を変えても、20階の欄は22のまま');
const odd=await p.evaluate(()=>{const o=[];document.querySelectorAll('*').forEach(e=>{for(const a of e.attributes)if(!/^[a-zA-Z][a-zA-Z0-9:-]*$/.test(a.name))o.push(e.tagName+' '+a.name)});return o});
ok(odd.length===0,'画面に壊れた属性がない'+(odd.length?': '+odd.slice(0,3).join(', '):''));
await p.click('[data-act=vchsave]');await p.waitForTimeout(1500);
S=await st(p);const vr=S.confirmed[W].vr.v1.rows;console.log(' 保存:',JSON.stringify(vr.map(r=>[r.floor,r.ret,r.rets])));
ok(vr.find(r=>r.floor===16).ret===17&&vr.find(r=>r.floor===20).ret===22,'搬出を変える: 16階を17階にしても20階の戻し階(22階)は残る');
await cx.close();
await b.close();console.log(bad?'NG '+bad+'件':'すべてOK');if(bad)process.exit(1)})();
