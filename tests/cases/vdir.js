// 業者の連絡先一覧(config.vdir)の書き直しが繰り返されないこと: 保存に失敗し続けても、並び順が違っても、1台の端末で10分に1回まで
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(process.env.HTML||REPO+'index.html','utf8'));
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:'',auto:0}},approved:{a:{company:'A社',vid:'a'},b:{company:'B社',vid:'b'},c:{company:'A社',vid:'c'}},
  vendors:{a:{floors:{10:{h:3,w:1}}},b:{floors:{11:{h:2,w:1}}},c:{floors:{12:{h:2,w:0}}}},members:{m1:{company:'承認待ち社'}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
const open=async(deny,fsx)=>{const cx=await b.newContext({viewport:{width:1200,height:900}});await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
  await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
  await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
  await cx.addInitScript(([w,dn])=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';if(dn)window.__FAKE_DENY=['config'];if(!sessionStorage.__FS)sessionStorage.__FS=JSON.stringify(w)},[fsx,deny]);
  const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');return p};
const wc=p=>p.evaluate(()=>JSON.parse(sessionStorage.__WC||'{}').config||0);
/* ふつう: 開いたら1回だけ書き、そのあとは書かない */
const p1=await open(false,FS);await p1.waitForTimeout(6000);const n1=await wc(p1);const vd=await p1.evaluate(()=>window.__FS.config.main.vdir);
console.log('ふつう: 一覧の書き込み',n1,'回 / 一覧',JSON.stringify(vd));ok(n1===1&&vd&&vd.length===4,'開いたときに1回だけ書く(4社)');
/* 並び順だけ違う一覧がサーバーにあるとき: 書き直さない */
const fs2=JSON.parse(JSON.stringify(FS));fs2.config.main.vdir=vd.slice().reverse();
const p2=await open(false,fs2);await p2.waitForTimeout(5000);const n2=await wc(p2);console.log('並び順だけ違う: 書き込み',n2,'回');ok(n2===0,'並び順だけの違いでは書き直さない');
/* 保存に失敗し続けるとき(前に1分に何百回も書いた場合): 10分に1回まで */
const p3=await open(true,FS);await p3.waitForTimeout(8000);const n3=await wc(p3);console.log('保存に失敗し続ける: 8秒で書き込み',n3,'回');ok(n3<=1,'失敗し続けても、繰り返し書かない(10分に1回まで)');
console.log(bad?'NG '+bad+'件':'全部OK');await b.close()})();
