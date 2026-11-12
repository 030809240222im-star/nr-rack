// プッシュ通知: 「通知を受け取る」で端末を登録し、設定のお知らせを送信待ちに入れる。止めると登録を消す
// (試験用のブラウザは本物の通知サービスにつながらないので、登録の部分だけ仮のものに差し替える。http で開く必要がある)
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs'),http=require('http'),path=require('path');
const files={'/nr-rack/index.html':REPO+'index.html','/nr-rack/sw.js':REPO+'sw.js','/nr-rack/manifest.webmanifest':REPO+'manifest.webmanifest'};
const srv=http.createServer((q,r)=>{const f=files[q.url.split('?')[0]];if(!f){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':'application/json'});r.end(fs.readFileSync(f))}).listen(0,async()=>{
const port=srv.address().port;
const FS={config:{main:{evn:2,vapid:'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'}},approved:{v1:{company:'A',vid:'v1'}},vendors:{v1:{floors:{}}}};
const b=await chromium.launch();const cx=await b.newContext({viewport:{width:1100,height:800}});
await cx.grantPermissions(['notifications'],{origin:'http://localhost:'+port});
await cx.addInitScript(()=>{let cur=null;const fake={endpoint:'https://push.example/abc',options:{applicationServerKey:null},toJSON(){return {endpoint:this.endpoint,keys:{p256dh:'P',auth:'A'}}},unsubscribe:async()=>{cur=null;return true}};
 PushManager.prototype.subscribe=async function(){cur=fake;return fake};PushManager.prototype.getSubscription=async function(){return cur}});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='v1';window.__FAKE_EMAIL='v@x.jp';window.__FS=w},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('http://localhost:'+port+'/nr-rack/index.html');await p.click('#lg-google');await p.waitForTimeout(800);
console.log('ボタン:',await p.locator('[data-act=push]').innerText());
await p.click('[data-act=push]');await p.waitForTimeout(2500);
console.log('結果:',(await p.locator('.note').first().innerText()).slice(0,50));
let S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));
console.log('登録:',Object.keys((S.push||{}).v1&&S.push.v1.subs||{}).length,'件 kind',S.push&&S.push.v1.kind,'| 送信待ち:',JSON.stringify(Object.values(S.outbox||{}).map(x=>x.to)));
console.log('ボタン:',await p.locator('[data-act=push]').innerText());
await p.click('[data-act=push]');await p.waitForTimeout(300);await p.click('[data-act=push]');await p.waitForTimeout(1200);
S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));console.log('止めた後の登録:',Object.keys(S.push.v1.subs||{}).length,'件');
await b.close();srv.close()});
