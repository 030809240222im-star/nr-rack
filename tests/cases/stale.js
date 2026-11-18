// 確定した台数が知らないうちに変わらないこと: 端末に残っていた古いデータで確定し直さない・書き戻さない、行の順番が変わっても別の行を書き換えない
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(process.env.HTML||REPO+'index.html','utf8'));
const W='2026-11-20';/* 金曜。確定日は11/18(水) */
const rows=[{vid:'a',floor:10,units:3,ev:1,to:null,ret:null,n:'A社'},{vid:'b',floor:11,units:2,ev:1,to:null,ret:null,n:'B社'},{vid:'c',floor:12,units:2,ev:1,to:null,ret:null,n:'C社'}];
const FS={config:{main:{evn:1,ev:{1:[1,40]},auto:2,wdFrom:''}},approved:{a:{company:'A社',vid:'a'},b:{company:'B社',vid:'b'},c:{company:'C社',vid:'c'}},
 vendors:{a:{floors:{10:{h:9,w:8,s:'2026-11-01'}}},b:{floors:{11:{h:9,w:8,s:'2026-11-01'}}},c:{floors:{12:{h:9,w:8,s:'2026-11-01'}}}},
 days:{[W]:{cap:7,elev:[1]}},confirmed:{[W]:{rows,vids:['a','b','c'],at:'2026-11-18T06:15:00Z',by:'毎朝の自動処理',auto:true,hist:[{at:'2026-11-18T06:15:00Z',by:'毎朝の自動処理',t:'自動で確定'}]}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
const open=async(stale)=>{const cx=await b.newContext({viewport:{width:1200,height:900}});
await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';if(!sessionStorage.__FS)window.__FS=w.F;window.__FAKE_STALE=w.stale},{F:FS,stale});
const p=await cx.newPage();await p.clock.setFixedTime(new Date(2026,10,18,9,0));p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(1200);return {cx,p}};
const st=p=>p.evaluate(()=>JSON.parse(sessionStorage.__FS||'{}'));
// 1) 端末に残っていたデータがまだ確定前(11/20の確定がない)のとき、管理者が開いても確定し直さない
let {cx,p}=await open({confirmed:{}});
let S=await st(p);const c1=(S.confirmed||{})[W]||FS.confirmed[W];
console.log('古いデータのあいだ: 行',JSON.stringify(c1.rows.map(r=>[r.vid,r.units])),'履歴',c1.hist.map(h=>h.t).join('/'));
ok(JSON.stringify(c1.rows.map(r=>[r.vid,r.units]))==='[["a",3],["b",2],["c",2]]'&&c1.hist.length===1,'古いデータでは自動確定し直さない(毎朝の自動処理の確定がそのまま)');
await p.evaluate(()=>window.__releaseStale());await p.waitForTimeout(800);
S=await st(p);ok(S.confirmed[W].hist.length===1&&S.confirmed[W].by==='毎朝の自動処理','最新のデータが届いたあとも、確定は1回のまま');
await cx.close();
// 2) 古いデータのあいだは、確定した行を書き換えられない(古い行で上書きしない)
({cx,p}=await open({confirmed:{[W]:{rows:[{vid:'a',floor:10,units:5,ev:1,n:'A社'}],hist:[]}}}));
await p.click('[data-tab=cnf]');await p.waitForTimeout(300);
await p.fill('#cu-'+W+'-0','4');await p.locator('#cu-'+W+'-0').blur();await p.waitForTimeout(500);
const msg=(await p.locator('.note.bad').first().innerText().catch(()=>'')).replace(/\s+/g,' ');console.log(' 古いデータで台数を変えた:',msg.slice(0,60));
S=await st(p);ok(/最新の内容をまだ読み込めていない/.test(msg)&&JSON.stringify(S.confirmed[W].rows.map(r=>[r.vid,r.units]))==='[["a",3],["b",2],["c",2]]','古いデータのあいだは書き換えず、サーバーの行(3社)が残る');
await cx.close();
// 3) 行の順番が変わっても、別の行を書き換えない: B社の欄に入力中に、A社の行がほかの人に消される
({cx,p}=await open(null));
await p.click('[data-tab=cnf]');await p.waitForTimeout(300);
const inp=p.locator('#cu-'+W+'-1');await inp.fill('1');
await p.evaluate(w=>{const S=window.__FS;S.confirmed[w].rows.shift();sessionStorage.__FS=JSON.stringify(S);window.__releaseStale()},W);await p.waitForTimeout(500);
await inp.evaluate(e=>e.dispatchEvent(new Event('change',{bubbles:true})));await p.waitForTimeout(600);
S=await st(p);console.log(' A社が消えたあとにB社を1台に:',JSON.stringify(S.confirmed[W].rows.map(r=>[r.vid,r.units])));
ok(JSON.stringify(S.confirmed[W].rows.map(r=>[r.vid,r.units]))==='[["b",1],["c",2]]','B社の欄の入力はB社の行に入る(C社の行は変わらない)');
await cx.close();
await b.close();console.log(bad?'NG '+bad+'件':'すべてOK');if(bad)process.exit(1)})();
