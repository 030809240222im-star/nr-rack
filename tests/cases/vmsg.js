// 業者から連絡を送る(管理者・盛替え業者・他の業者)と、送った連絡の削除
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const FS={config:{main:{evn:2}},approved:{v1:{company:'サンユー',vid:'v1'},v2:{company:'日本建工',vid:'v2'}},crews:{c1:{company:'盛替A',email:'c@x.jp'}},
 vendors:{v1:{floors:{10:{h:3,w:1}}},v2:{floors:{11:{h:3,w:1}}},vm:{name:'手入力業者',manual:true,floors:{}}}};
(async()=>{const b=await chromium.launch();
const open=async(uid,email,f,F,simple)=>{const cx=await b.newContext({viewport:{width:1100,height:900}});
await cx.addInitScript(s=>{try{localStorage.setItem('nr-uipref',JSON.stringify({simple:s}))}catch(e){}},simple!==false);
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID=w.uid;window.__FAKE_EMAIL=w.email;if(!sessionStorage.__FS)window.__FS=w.F},{uid,email,F});
const p=await cx.newPage();p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/'+f);await p.click('#lg-google');await p.waitForTimeout(900);return {cx,p}};
const state=async p=>p.evaluate(()=>JSON.parse(sessionStorage.__FS));
// 1) 管理者が開くと、業者が送れる会社の一覧(config.vdir)ができる
let {cx,p}=await open('g1','kowa0371@gmail.com','main-test.html',FS);let S=await state(p);
console.log('会社の一覧:',JSON.stringify((S.config.main.vdir||[]).map(x=>x.n)));await cx.close();
// 2) サンユーが、管理者・盛替え業者・日本建工に送る(簡単表示の「お知らせ」)
({cx,p}=await open('v1','v@x.jp','main-test.html',S));
await p.click('[data-act=stab][data-tab=s-news]');await p.waitForTimeout(200);
console.log('宛先:',(await p.locator('#vm-to option').allInnerTexts()).join('|'));
for(const [to,m] of [['*a','管理者さんへ'],['*c','盛替えさんへ'],['v2','日本建工さんへ']]){await p.selectOption('#vm-to',to);await p.fill('#vm-msg',m);await p.click('[data-act=vmsend]');await p.waitForTimeout(400);console.log(' ',(await p.locator('.note').first().innerText()).slice(0,30))}
console.log('送った連絡:',(await p.locator('h3:has-text("送った連絡") + .tablewrap tbody tr').allInnerTexts()).map(t=>t.replace(/\s+/g,' ')).join(' / '));
S=await state(p);console.log('送信待ち:',JSON.stringify(Object.values(S.outbox||{}).map(x=>x.to+(x.vid?':'+x.vid:'')).sort()));await cx.close();
// 3) 日本建工のお知らせに「サンユーから」が出る。見ましたを押す
({cx,p}=await open('v2','w@x.jp','main-test.html',S));
await p.click('[data-act=stab][data-tab=s-news]');await p.waitForTimeout(200);
console.log('日本建工のお知らせ:',(await p.locator('.scard').first().innerText()).replace(/\s+/g,' '));
await p.locator('.scard [data-act=ack]').first().click();await p.waitForTimeout(400);S=await state(p);await cx.close();
// 4) 管理者: 今日やることと「業者から届いた連絡」。見ました
({cx,p}=await open('g1','kowa0371@gmail.com','main-test.html',S));
console.log('管理者のやること:',(await p.locator('.task b').allInnerTexts()).filter(t=>/業者から/.test(t)).join('|'));
console.log('届いた連絡:',(await p.locator('h2:has-text("業者から届いた連絡") ~ .scard').allInnerTexts()).map(t=>t.replace(/\s+/g,' ')).join(' / '));
await p.locator('[data-act=iack]').first().click();await p.waitForTimeout(400);
console.log('管理者の送った連絡に、業者同士の連絡は出ない:',await p.locator('h3:has-text("送った連絡")').count());
S=await state(p);await cx.close();
// 5) 盛替え業者: 業者からの連絡。見ました
({cx,p}=await open('c1','c@x.jp','crew-test.html',S));
console.log('盛替え業者:',(await p.locator('.todaybox:has-text("業者からの連絡")').innerText().catch(()=>'(なし)')).replace(/\s+/g,' '));
await p.locator('[data-act=iack]').first().click();await p.waitForTimeout(400);S=await state(p);await cx.close();
// 6) サンユー: 3件とも「見ました」になり、1件削除できる
({cx,p}=await open('v1','v@x.jp','main-test.html',S));
await p.click('[data-act=stab][data-tab=s-news]');await p.waitForTimeout(200);
const rows=()=>p.locator('h3:has-text("送った連絡") + .tablewrap tbody tr');
console.log('見ました:',(await rows().allInnerTexts()).map(t=>t.replace(/\s+/g,' ').replace(/\d+\/\d+ \d+:\d+/,'')).join(' / '));
await p.locator('[data-act=vmdel]').first().click();await p.waitForTimeout(400);console.log('削除後の行数:',await rows().count());
// 詳しい表示にも出る
await p.click('[data-act=simple]');await p.waitForTimeout(300);console.log('詳しい表示に連絡を送る:',await p.locator('#vm-to').count());S=await state(p);await cx.close();
// 7) 管理者の送った連絡を削除
({cx,p}=await open('g1','kowa0371@gmail.com','main-test.html',S));
await p.selectOption('#am-to','v1');await p.fill('#am-msg','管理者からのテスト');await p.click('[data-act=amsend]');await p.waitForTimeout(400);
const ar=()=>p.locator('h3:has-text("送った連絡") + .tablewrap tbody tr');console.log('管理者の送った連絡:',await ar().count());
await p.locator('[data-act=amdel]').first().click();await p.waitForTimeout(400);console.log(' 削除後:',await ar().count());
await p.locator('[data-act=idel]').first().click();await p.waitForTimeout(400);console.log(' 届いた連絡を削除後:',await p.locator('h2:has-text("業者から届いた連絡")').count());
S=await state(p);await cx.close();
({cx,p}=await open('v1','v@x.jp','main-test.html',S));await p.click('[data-act=stab][data-tab=s-news]');await p.waitForTimeout(200);
console.log('管理者が一覧から消しても、業者のお知らせには残る:',(await p.locator('.scard').allInnerTexts()).some(t=>/管理者からのテスト/.test(t)));await cx.close();
await b.close()})();
