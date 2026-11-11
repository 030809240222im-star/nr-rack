// 同じお知らせが重なったら1件にまとめる・変更のお知らせの文
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const k=D(2),t0=new Date(Date.now()-60000).toISOString(),t1=new Date(Date.now()-30000).toISOString();
const msg='確定しました: 10階 2台(EV1前)';
const FS={config:{main:{evn:2}},approved:{v1:{company:'A',vid:'v1'}},vendors:{v1:{floors:{10:{h:6,w:4},11:{h:4,w:2}}}},days:{[k]:{cap:8,elev:[1]}},
 confirmed:{[k]:{rows:[{vid:'v1',floor:10,units:2,ev:1},{vid:'v1',floor:11,units:2,ev:1}]}},
 notices:{v1:{items:{a1:{d:k,kind:'confirm',msg,at:t0},a2:{d:k,kind:'confirm',msg,at:t1}}}}};
(async()=>{const b=await chromium.launch();
const open=async(uid,email)=>{const cx=await b.newContext({viewport:{width:1100,height:900}});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID=w.uid;window.__FAKE_EMAIL=w.email;if(!sessionStorage.__FS)window.__FS=w.FS},{uid,email,FS});
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(800);return {cx,p}};
let {cx,p}=await open('v1','v@x.jp');
console.log('重なった確定のお知らせ(1件になるはず):',await p.locator('[data-act=ack]').count());
await p.click('[data-act=ack]');await p.waitForTimeout(400);
const S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));console.log('確認した(2件とも):',Object.keys(S.notices.v1.ack||{}).sort().join(','));
await cx.close();
({cx,p}=await open('g1','kowa0371@gmail.com'));
await p.click('button[data-tab=cnf]');await p.waitForTimeout(300);
const del=p.locator('[data-act=cdel]').first();await del.click();await p.waitForTimeout(400);
const S2=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));const it=S2.notices.v1.items;const last=Object.values(it).sort((a,b)=>a.at<b.at?1:-1)[0];
console.log('変更のお知らせ:',last.msg);
await b.close()})();
