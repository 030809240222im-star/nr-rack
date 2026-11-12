// 盛替え業者への指示表示
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const FS={config:{main:{evn:2,ev:{1:[1,30],2:[31,60]},ns:{2:'44-46'}}},approved:{v1:{company:'サンオキ',vid:'v1'}},crews:{c1:{company:'盛替A',email:'c@x.jp'}},vendors:{v1:{floors:{45:{h:4,w:4}}}},days:{[D(3)]:{cap:8,elev:[1],moves:{'v1|45':{ev:1,to:30,u:4}}}}};
(async()=>{const b=await chromium.launch();const cx=await b.newContext({viewport:{width:900,height:900}});await cx.addInitScript(()=>{try{if(!localStorage.getItem('nr-uipref'))localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});/*FULLVIEW*/
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='c1';window.__FAKE_EMAIL='c@x.jp';window.__FS=w},FS);
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/crew-test.html');await p.click('#lg-google');await p.waitForTimeout(800);
console.log((await p.locator('.todaybox').allInnerTexts()).join('|'));await b.close()})();
