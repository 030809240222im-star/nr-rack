// 古い回収日・確定は、ふだんは読まない(35日前から先だけ)。前の月のカレンダー・記録・会社の画面を開いたときだけ読む
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const ds=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const rows=[{vid:'a',floor:10,units:3,ev:1,n:'A社'}];
const days={},confirmed={};[-90,-60,-40,-20,-3,5].forEach(n=>{days[ds(n)]={cap:5,elev:[1]};if(n<0)confirmed[ds(n)]={rows,vids:['a'],at:'2026-01-01T00:00:00Z',by:'管理者',hist:[]}});
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:'',auto:0}}/* 自動確定は止める(日付で件数が変わらないように) */,approved:{a:{company:'A社',vid:'a'}},vendors:{a:{floors:{10:{h:9,w:3,s:'2026-01-01'}}}},days,confirmed};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
const open=async(uid,email)=>{const cx=await b.newContext({viewport:{width:1200,height:900}});await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
  await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
  await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
  await cx.addInitScript(([w,u,e])=>{window.__FAKE_UID=u;window.__FAKE_EMAIL=e;if(!sessionStorage.__FS)window.__FS=w},[FS,uid,email]);
  const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(1200);return p};
const n=p=>p.evaluate(()=>({c:(window.__LASTN||{}).confirmed,d:(window.__LASTN||{}).days,f:(window.__FROM||{}).confirmed}));
const a=await open('g1','kowa0371@gmail.com');
let x=await n(a);console.log('管理者が開いたとき:',JSON.stringify(x));ok(x.c===2&&x.d===3&&x.f===ds(-35),'ふだんは35日前から先だけ読む(確定2件・回収日3件)');
await a.click('button[data-tab=cal]');for(let i=0;i<2;i++){await a.click('[data-act=prev]');await a.waitForTimeout(400)}
x=await n(a);console.log('2か月前のカレンダー:',JSON.stringify(x));ok(x.c>=3&&x.f<ds(-35),'前の月のカレンダーを開くと、その月から読む');
await a.click('button[data-tab=rec]').catch(()=>{});await a.waitForTimeout(600);
x=await n(a);console.log('記録:',JSON.stringify(x));ok(x.c===5&&x.d===6&&x.f==='','記録を開くと全部読む(確定5件・回収日6件)');
const v=await open('a','a@x.jp');x=await n(v);console.log('業者が開いたとき:',JSON.stringify(x));ok(x.c===2&&x.f===ds(-35),'業者も35日前から先だけ読む');
console.log(bad?'NG '+bad+'件':'全部OK');await b.close()})();
