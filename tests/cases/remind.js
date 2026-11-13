// 搬出予定の入力のお願い(土日祝を除いて4営業日前)と警告(3営業日前)
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
/* 土日祝を除いた営業日で数える: d4 = 今日が「お願い」の期間(確定の2営業日前〜)に入る回収日、d3 = 今日が「警告」の期間(確定の前の営業日〜)に入る回収日 */
const vm=require('vm'),ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(REPO+'index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const cf0=ctx.nrCfg({auto:2}),T=D(0);let d4=null,d3=null;
for(let i=1;i<20;i++){const x=D(i),b1=ctx.nrBizBack(x,4,cf0),b2=ctx.nrBizBack(x,3,cf0),cd=ctx.nrConfirmDay(x,cf0);if(!d4&&T>=b1&&T<b2)d4=x;if(!d3&&T>=b2&&T<cd)d3=x}
const w4=new Date(d4+'T12:00').getDay(),w3=new Date(d3+'T12:00').getDay();console.log('お願いの回収日',d4,'警告の回収日',d3);
// a: d4の曜日の担当で未入力 / b: d4の担当で入力あり / c: d3の曜日の担当で未入力 / e: 曜日の担当なし(対象外)
const FS={config:{main:{evn:2,auto:2,wdFrom:'',wd:{a:[w4],b:[w4],c:[w3]}}},approved:{a:{company:'A社',vid:'a'},b:{company:'B社',vid:'b'},c:{company:'C社',vid:'c'},e:{company:'E社',vid:'e'}},
 vendors:{a:{floors:{10:{h:5,w:0}}},b:{floors:{11:{h:5,w:3}}},c:{floors:{}},e:{floors:{12:{h:3,w:0}}}},days:{[d4]:{cap:8,elev:[1]},[d3]:{cap:8,elev:[1]}}};
(async()=>{const b=await chromium.launch();
const open=async(uid,email,F)=>{const cx=await b.newContext({viewport:{width:1100,height:900}});
await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":true}')}catch(e){}});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID=w.uid;window.__FAKE_EMAIL=w.email;if(!sessionStorage.__FS)window.__FS=w.FS},{uid,email,FS:F||FS});
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(1000);return {cx,p}};
let {cx,p}=await open('g1','kowa0371@gmail.com');
const S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));
for(const v of ['a','b','c','e']){const it=((S.notices||{})[v]||{}).items||{};console.log(v,Object.keys(it).join(',')||'(なし)',Object.values(it).map(x=>x.msg.slice(0,40)).join(' / '))}
console.log('メール送信待ち:',Object.keys(S.outbox||{}).filter(k=>k.startsWith('rm')).join(', '));
console.log('今日やること:',(await p.locator('.task b').allInnerTexts()).join(' / '));
await p.reload();await p.waitForTimeout(1000);const S2=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));console.log('開き直しても二重にならない:',Object.keys(S2.notices.a.items).length);
await cx.close();
({cx,p}=await open('c','c@x.jp',S2));console.log('C社の画面:',(await p.locator('.tabs button').allInnerTexts()).join('|'));
console.log(' 予定の画面:',(await p.locator('.todo').first().innerText()).replace(/\s+/g,' ').slice(0,70));await p.click('[data-act=stab][data-tab=s-news]');await p.waitForTimeout(200);console.log(' ',(await p.locator('.scard').first().innerText()).replace(/\s+/g,' ').slice(0,80));
await b.close()})();
