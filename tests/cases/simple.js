// かんたん表示(業者・盛替え業者・管理者)と、くわしく表示への切り替え
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const k=D(0),k2=D(2);
const FS={config:{main:{evn:3}},approved:{v1:{company:'サンユー',vid:'v1'},v2:{company:'日本建工',vid:'v2'},v3:{company:'鉱工産業',vid:'v3'}},crews:{c1:{company:'盛替A',email:'c@x.jp'}},members:{m9:{company:'新しい会社',email:'n@x.jp',at:new Date().toISOString()}},
 vendors:{v1:{floors:{17:{h:14,w:10},21:{h:6,w:2}}},v2:{floors:{25:{h:2,w:0}}},v3:{floors:{24:{h:8,w:4}}}},days:{[k]:{cap:8,elev:[1],tf:'18:00',tt:'19:00'},[k2]:{cap:8,elev:[1]}},
 confirmed:{[k]:{rows:[{vid:'v1',floor:17,units:4,ev:1,n:'サンユー'},{vid:'v3',floor:24,units:4,ev:1,n:'鉱工産業',ret:20}]}},
 notices:{v1:{items:{a1:{d:k,kind:'confirm',msg:'確定しました: 17階 4台(EV1前)',at:new Date().toISOString()}}}},
 orders:{v2:{items:{o1:{f:25,u:4,st:'plan',plan:{d:k},n:'日本建工',at:new Date().toISOString()},o2:{f:12,u:2,st:'new',n:'日本建工',at:new Date().toISOString()}}}}};
(async()=>{const b=await chromium.launch();
const open=async(uid,email,f,dev)=>{const cx=await b.newContext(dev||{...devices['iPhone 13']});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID=w.uid;window.__FAKE_EMAIL=w.email;if(!sessionStorage.__FS)window.__FS=w.FS},{uid,email,FS});
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/'+f);await p.click('#lg-google');await p.waitForTimeout(800);return {cx,p}};
const st=p=>p.evaluate(()=>JSON.parse(sessionStorage.__FS));
const sw=p=>p.evaluate(()=>document.documentElement.scrollWidth+'/'+document.documentElement.clientWidth);
// 業者
let {cx,p}=await open('v1','v@x.jp','main-test.html');
console.log('業者 タブ:',(await p.locator('.tabs button').allInnerTexts()).join('|'),' 幅',await sw(p));
console.log(' よてい:',(await p.locator('.todo').innerText()).replace(/\s+/g,' ').slice(0,90));
await p.click('[data-act=splace]');await p.waitForTimeout(300);console.log(' 置きました→',JSON.stringify((await st(p)).vendors.v1.placed));
await p.click('[data-act=stab][data-tab=s-count]');await p.waitForTimeout(200);
await p.locator('#sw-17').locator('xpath=preceding-sibling::button[1]').click();await p.waitForTimeout(1600);console.log(' 台数 17階 出したい→',(await st(p)).vendors.v1.floors['17'].w);
await p.fill('#s-addf','30');await p.click('[data-act=saddf]');await p.waitForTimeout(200);console.log(' 足した階のカード:',await p.locator('#sh-30').count());
await p.click('[data-act=stab][data-tab=s-news]');await p.waitForTimeout(200);await p.click('[data-act=ack]');await p.waitForTimeout(300);console.log(' 見ました→',Object.keys((await st(p)).notices.v1.ack||{}).length);
await p.click('[data-act=simple]');await p.waitForTimeout(300);console.log(' くわしく表示:',(await p.locator('.tabs button').allInnerTexts()).join('|'));
await p.click('[data-act=simple]');await p.waitForTimeout(300);await cx.close();
// 盛替え業者
({cx,p}=await open('c1','c@x.jp','crew-test.html'));
console.log('盛替え:',(await p.locator('.sprog').innerText()).replace(/\s+/g,' '),' 幅',await sw(p));
await p.click('[data-act=sev][data-key^="in:"][data-ev="3"]');await p.click('[data-act=sin]');await p.waitForTimeout(400);
let S=await st(p);console.log(' 入れた→',JSON.stringify(S.orders.v2.items.o1.done&&{ev:S.orders.v2.items.o1.done.ev,u:S.orders.v2.items.o1.done.u}),'25階',S.vendors.v2.floors['25'].h);
await p.click('.job >> nth=0 >> [data-act=chk][data-k=ok]');await p.waitForTimeout(300);
await p.click('.job >> nth=0 >> [data-act=sev][data-ev="2"]');await p.click('.job >> nth=0 >> [data-act=sback]');await p.waitForTimeout(400);
S=await st(p);console.log(' 戻した→',JSON.stringify(Object.values(S.confirmed[k].st).map(x=>x.back&&x.back.ev)));
await p.click('.job >> nth=1 >> [data-act=sshort]');await p.waitForTimeout(200);await p.click('.job >> nth=1 >> [data-act=chk][data-k=short]');await p.waitForTimeout(300);
console.log(' 足りない→',(await p.locator('.job >> nth=1 >> .res-l').innerText()).replace(/\s+/g,' '));
console.log(' 進み具合:',(await p.locator('.sprog span').innerText()));await cx.close();
// 管理者
({cx,p}=await open('g1','kowa0371@gmail.com','main-test.html',{viewport:{width:1280,height:900}}));
console.log('管理者 タブ:',(await p.locator('.tabs button').allInnerTexts()).join('|').replace(/\n/g,''));
console.log(' やること:',(await p.locator('.task b').allInnerTexts()).join(' / '));
await p.click('.task >> nth=0 >> [data-act=sgo]');await p.waitForTimeout(300);console.log(' 開いた先:',await p.locator('.tabs button[aria-selected=true]').innerText(),'選んだ日',await p.locator('.dhead h2').innerText().catch(()=>'-'));
console.log(' 車の帯:',(await p.locator('.bands').first().innerText().catch(()=>'')).replace(/\s+/g,' '));
await p.click('[data-act=simple]');await p.waitForTimeout(300);console.log(' くわしく:',(await p.locator('.tabs button').count()),'タブ');
await b.close()})();
