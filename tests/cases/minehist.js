// 業者の「自社の搬出予定」: 搬出日から3日たった行は一覧から消える
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const NOW=new Date(2026,10,20,12,0);const D=n=>{const d=new Date(NOW.getTime()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const conf={},days={};[0,-1,-2,-3,-5,3].forEach((n,i)=>{conf[D(n)]={rows:[{vid:'v1',floor:10+i,units:2,ev:1,n:'サンユー'}]};days[D(n)]={cap:8,elev:[1]}});
const FS={config:{main:{evn:2}},approved:{v1:{company:'サンユー',vid:'v1'}},vendors:{v1:{floors:{10:{h:9,w:3}}}},days,confirmed:conf};
(async()=>{const b=await chromium.launch();const cx=await b.newContext({viewport:{width:1100,height:900}});
await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='v1';window.__FAKE_EMAIL='v@x.jp';window.__FS=w},FS);
const p=await cx.newPage();await p.clock.setFixedTime(NOW);p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(900);
const rows=await p.locator('section:has(h2:has-text("自社の搬出予定")) tbody tr td:first-child').allInnerTexts();
console.log('11/20に見える行:',rows.map(t=>t.split('\n')[0]).join(' / '));
const want=[-2,-1,0,3].map(D),got=rows.length;console.log(got===4&&!rows.some(t=>t.includes('11/17')||t.includes('11/15'))?'OK 11/17(3日前)と11/15は消え、11/18・19(終了)と今日・先の予定は残る':'NG');
await b.close()})();
