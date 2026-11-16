// 管理者の「優先順位」タブ: 基準日はまだ確定していない最初の回収日、確定した日の分を差し引いた順位が、その日の配分の順と同じ
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
const NOW=new Date(2026,10,16,12,0),M='2026-11-16',W='2026-11-20';
const FS={config:{main:{evn:1,ev:{1:[1,40]},wdFrom:''}},approved:{p:{company:'サンオキ',vid:'p'},q:{company:'日本建工',vid:'q'}},
 vendors:{p:{floors:{9:{h:20,w:10,s:'2026-11-05'}}},q:{floors:{10:{h:10,w:6,s:'2026-11-05'}}}},
 days:{[M]:{cap:8,elev:[1]},[W]:{cap:4,elev:[1]}},confirmed:{[M]:{rows:[{vid:'p',floor:9,units:8,ev:1,n:'サンオキ'}]}}};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{const b=await chromium.launch();
for(const [n,o] of [['ph',devices['iPhone 13']],['pc',{viewport:{width:1280,height:900}}]]){
const cx=await b.newContext(o);await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
await cx.addInitScript(w=>{window.__FAKE_UID='g1';window.__FAKE_EMAIL='kowa0371@gmail.com';window.__FS=w},FS);
const p=await cx.newPage();await p.clock.setFixedTime(NOW);p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file://'+WORK+'/main-test.html');await p.click('#lg-google');await p.waitForTimeout(900);
await p.click('button[data-tab=pri]');await p.waitForTimeout(300);
const t=(await p.locator('section.panel',{hasText:'業者の優先順位'}).first().innerText()).replace(/\s+/g,' ');
console.log(n,t.slice(0,420));
const rk=(await p.locator('.ranklist .rk').allInnerTexts()).map(x=>x.replace(/\s+/g,' '));console.log(' 業者の優先順位:',JSON.stringify(rk));
ok(/11\/20.*まだ確定していない最初の回収日/.test(t)&&/確定した回収日\(11\/16/.test(t),n+' 基準日は11/20、11/16の確定分を差し引くと出る');
ok(rk[0]&&rk[0].includes('日本建工')&&rk[1].includes('サンオキ 2台'),n+' 1位は日本建工、サンオキは残り2台');
ok((await p.locator('section.panel th').allInnerTexts()).includes('業者の待ち'),n+' 階ごとの表に「業者の待ち」の列');
if(n==='pc')await p.screenshot({path:WORK+'/priui.png',fullPage:true});
console.log(' はみ出し:',await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth));
await p.click('button[data-tab=cal]');await p.waitForTimeout(200);await p.click(`[data-act=sel][data-date="${W}"]`);await p.waitForTimeout(300);
const rows=(await p.locator('table tbody tr').allInnerTexts()).map(x=>x.replace(/\s+/g,' '));console.log(' 11/20の配分:',JSON.stringify(rows.slice(0,3)));
ok(rows[0]&&/^1 日本建工 10階 4/.test(rows[0]),n+' 11/20の配分も日本建工が1番');
if(n==='pc'){await p.click('button[data-tab=set]');await p.waitForTimeout(200);
  ok(await p.locator('#s-wq').inputValue()==='5'&&await p.locator('#s-crittop').isChecked(),n+' 設定: 業者の待ち台数の重み(初期値5)と、余力なしを最優先にする(初期値オン)');
  await p.fill('#s-wq','0');await p.locator('#s-wq').blur();await p.click('#s-crittop');await p.waitForTimeout(400);
  const S=await p.evaluate(()=>JSON.parse(sessionStorage.__FS));ok(S.config.main.wQ===0&&S.config.main.critTop===false,n+' 設定を変えると保存される: '+JSON.stringify({wQ:S.config.main.wQ,critTop:S.config.main.critTop}));
  console.log(' 設定の説明:',(await p.locator('#s-crittop').locator('xpath=../following-sibling::p[1]').innerText()).slice(0,80))}
await cx.close()}
await b.close();console.log(bad?'NG '+bad+'件':'すべてOK');if(bad)process.exit(1)})();
