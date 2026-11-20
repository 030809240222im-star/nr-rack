// 本物の Firebase(npm の firebase@10.12.2)と、手元のエミュレーター(Firestore・Auth)で、アプリの保存が本当にサーバーに届くかを確かめる
const {chromium}=require('playwright');const fs=require('fs'),http=require('http');
const FB=fs.readFileSync(__dirname+'/fb.js','utf8');
const SRC=process.env.HTML||__dirname+'/../../index.html';
let html=fs.readFileSync(SRC,'utf8');
html=html.replace('import {initializeApp} from','import {initializeApp,connectAuthEmulator,connectFirestoreEmulator} from');
html=html.replace('var fb=initializeApp(CFG.firebase),auth=getAuth(fb),fs=openStore(fb);','var fb=initializeApp(CFG.firebase),auth=getAuth(fb),fs=openStore(fb);connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});connectFirestoreEmulator(fs,"127.0.0.1",8085);');
if(!html.includes('connectFirestoreEmulator(fs'))throw new Error('hook failed');
const srv=http.createServer((q,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(html)}).listen(8099);
const DB='http://127.0.0.1:8085/v1/projects/nr-rack/databases/default/documents/';
const val=v=>v===null?{nullValue:null}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?(Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}):typeof v==='string'?{stringValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(val)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,val(x)]))}};
const unval=x=>'stringValue' in x?x.stringValue:'integerValue' in x?Number(x.integerValue):'doubleValue' in x?x.doubleValue:'booleanValue' in x?x.booleanValue:'nullValue' in x?null:'arrayValue' in x?(x.arrayValue.values||[]).map(unval):'mapValue' in x?Object.fromEntries(Object.entries(x.mapValue.fields||{}).map(([k,y])=>[k,unval(y)])):x;
const put=(p,d)=>fetch(DB+p,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:val(d).mapValue.fields})}).then(r=>r.json());
const get=p=>fetch(DB+p,{headers:{Authorization:'Bearer owner'}}).then(r=>r.json()).then(j=>j.fields?unval({mapValue:{fields:j.fields}}):null);
const AU='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/';
const user=async(email)=>{const j=await fetch(AU+'accounts:signUp?key=k',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'secret12',returnSecureToken:true})}).then(r=>r.json());
  await fetch(AU+'accounts:update?key=k',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({localId:j.localId,emailVerified:true})});return j.localId};
const QR=fs.readFileSync(__dirname+'/../lib/qrcode.min.js','utf8');
const routes=async cx=>{
  await cx.route(/gstatic\.com\/firebasejs\/10\.12\.2\/firebase-app\.js/,r=>r.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:FB}));
  await cx.route(/gstatic\.com\/firebasejs\/10\.12\.2\/firebase-(auth|firestore)\.js/,r=>r.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:'export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";'}));
  await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:QR}));
};
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log((c?'OK ':'NG ')+m)};
(async()=>{
  const vu=await user('a@x.jp'),au=await user('kowa0371@gmail.com');
  await put('config/main',{evn:1,ev:{1:[1,40]},wdFrom:''});
  await put('approved/'+vu,{company:'サンオキ',email:'a@x.jp',vid:vu,at:'2026-11-01T00:00:00Z'});
  await put('members/'+vu,{company:'サンオキ',email:'a@x.jp',at:'2026-11-01T00:00:00Z'});
  await put('vendors/'+vu,{floors:{16:{h:6,w:4,s:'2026-11-01'}}});
  const DD=new Date(Date.now()+9*864e5);const DAY=DD.getFullYear()+'-'+String(DD.getMonth()+1).padStart(2,'0')+'-'+String(DD.getDate()).padStart(2,'0');
  await put('days/'+DAY,{cap:4,elev:[1]});
  const b=await chromium.launch();
  const login=async(page,email)=>{await page.goto('http://localhost:8099/');await page.waitForSelector('#lg-email',{timeout:20000});await page.fill('#lg-email',email);await page.fill('#lg-pass','secret12');await page.click('#lg-go');await page.waitForTimeout(5000)};
  const logs=[];
  // 業者(詳しい表示)
  const cx=await b.newContext({viewport:{width:1100,height:900}});await cx.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
  await routes(cx);const p=await cx.newPage();p.on('console',m=>{if(m.type()==='error'||/firestore|Firestore/i.test(m.text()))logs.push(m.text().slice(0,200))});p.on('pageerror',e=>logs.push('ERR '+e.message));
  await login(p,'a@x.jp');
  console.log('業者の画面:',(await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,120));
  const s1=await get('seen/'+vu);console.log(' サーバーの最終ログイン:',JSON.stringify(s1));ok(s1&&s1.at,'業者の最終ログインがサーバーに届く');
  await p.click('button[data-tab=vin]').catch(()=>{});await p.waitForTimeout(800);
  await p.fill('#w-16','3');await p.locator('#w-16').blur();await p.waitForTimeout(3000);
  const v1=await get('vendors/'+vu);console.log(' サーバーの台数:',JSON.stringify(v1&&v1.floors));ok(v1&&v1.floors&&v1.floors['16'].w===3,'業者が出したい台数を変えると、サーバーに届く');
  const banner=await p.locator('.syncbad').count();ok(banner===0,'届いているときは赤い注意が出ない');
  // 同じ端末でもう1つ画面(タブ)を開く → 新しい画面で変えても届く
  const p2=await cx.newPage();p2.on('pageerror',e=>logs.push('ERR2 '+e.message));p2.on('console',m=>{if(m.type()==='error')logs.push('2: '+m.text().slice(0,200))});
  await p2.goto('http://localhost:8099/');await p2.waitForTimeout(6000);
  await p2.click('button[data-tab=vin]').catch(()=>{});await p2.waitForTimeout(800);
  await p2.fill('#w-16','2').catch(e=>logs.push('fill2 '+e.message.slice(0,80)));await p2.locator('#w-16').blur().catch(()=>{});await p2.waitForTimeout(3000);
  const v2=await get('vendors/'+vu);console.log(' 2つ目の画面で変えたあと:',JSON.stringify(v2&&v2.floors));ok(v2&&v2.floors['16'].w===2,'同じ端末の2つ目の画面で変えても、サーバーに届く');
  // 古い画面(1つ目)で変える
  await p.bringToFront();await p.fill('#w-16','1').catch(e=>logs.push('fill1 '+e.message.slice(0,80)));await p.locator('#w-16').blur().catch(()=>{});await p.waitForTimeout(3000);
  const v3=await get('vendors/'+vu);console.log(' 1つ目の画面で変えたあと:',JSON.stringify(v3&&v3.floors),' 1つ目の注意:',await p.locator('.syncbad').innerText().catch(()=>'なし'));
  ok(v3&&v3.floors['16'].w===1||await p.locator('.syncbad').count()>0,'古い画面で変えたら、届くか、届かないと赤く出る');
  // 電波が切れているあいだの入力 → 未送信と出て、つながると届く
  await p.bringToFront();await cx.setOffline(true);await p.waitForTimeout(500);
  await p.fill('#w-16','5');await p.locator('#w-16').blur();await p.waitForTimeout(5000);
  const off=await get('vendors/'+vu),ban=(await p.evaluate(()=>document.body.innerText)).match(/未送信 \d+件[^\n]{0,40}/);
  console.log(' 電波なしで5に変えた: サーバー',off.floors['16'].w,'/ 画面',ban&&ban[0]);ok(off.floors['16'].w!==5&&ban,'電波がないあいだは「未送信」と出る');
  await cx.setOffline(false);await p.waitForTimeout(8000);
  const on=await get('vendors/'+vu);console.log(' つながったあと: サーバー',on.floors['16'].w);ok(on.floors['16'].w===5,'つながると、未送信の入力がサーバーに届く');
  const v3b=on;
  // 管理者
  const ca=await b.newContext({viewport:{width:1100,height:900}});await ca.addInitScript(()=>{try{localStorage.setItem('nr-uipref','{"simple":false}')}catch(e){}});
  await routes(ca);const pa=await ca.newPage();pa.on('pageerror',e=>logs.push('ERRA '+e.message));pa.on('console',m=>{if(m.type()==='error')logs.push('A: '+m.text().slice(0,200))});
  await login(pa,'kowa0371@gmail.com');
  const sa=await get('seen/'+au);ok(sa&&sa.at,'管理者の最終ログインがサーバーに届く');
  await pa.click('button[data-tab=vin]').catch(()=>{});await pa.waitForTimeout(1500);
  const aw=await pa.locator('#w-16').inputValue().catch(()=>'?');console.log(' 管理者に見える台数:',aw);ok(aw===String((v3b&&v3b.floors['16'].w)||''),'業者が入れた台数が管理者に見える');
  // 管理者が確定する(サーバーで確かめてから作る取引)
  await pa.click('button[data-tab=cal]').catch(()=>{});await pa.waitForTimeout(800);
  for(let i=0;i<3&&!(await pa.locator('[data-act=sel][data-date="'+DAY+'"]').count());i++){await pa.click('[data-act=next]').catch(()=>{});await pa.waitForTimeout(500)}
  await pa.click('[data-act=sel][data-date="'+DAY+'"]').catch(e=>logs.push('sel '+e.message.slice(0,60)));await pa.waitForTimeout(800);
  await pa.click('[data-act=confirm]').catch(e=>logs.push('confirm '+e.message.slice(0,60)));await pa.waitForTimeout(4000);
  const cfd=await get('confirmed/'+DAY);console.log(' 確定:',JSON.stringify(cfd&&cfd.rows));ok(cfd&&cfd.rows&&cfd.rows[0].vid===vu,'管理者の確定がサーバーに届く(サーバーで確かめてから作る)');
  // 業者が確定後に変える
  await p.reload();await p.waitForTimeout(6000);
  await p.click('[data-act=vchgopen]').catch(e=>logs.push('vchg '+e.message.slice(0,60)));await p.waitForTimeout(800);
  await p.fill('#vcu-'+DAY+'-0','3').catch(e=>logs.push('vcu '+e.message.slice(0,60)));await p.locator('#vcu-'+DAY+'-0').blur().catch(()=>{});await p.waitForTimeout(500);
  await p.click('[data-act=vchsave]').catch(e=>logs.push('vsave '+e.message.slice(0,60)));await p.waitForTimeout(4000);
  const cf2=await get('confirmed/'+DAY);console.log(' 業者が変えたあと vr:',JSON.stringify(cf2&&cf2.vr));ok(cf2&&cf2.vr&&cf2.vr[vu]&&cf2.vr[vu].rows[0].units===3,'業者の確定後の変更がサーバーに届く(ルールの許可も本物)');
  await pa.click('button[data-tab=mem]').catch(()=>{});await pa.waitForTimeout(1000);
  console.log(' 管理者の登録タブ:',((await pa.evaluate(()=>document.body.innerText)).match(/この端末の最終ログイン[^\n]*/)||[''])[0]);
  console.log('ブラウザのエラー:',logs.length?'\n  '+[...new Set(logs)].slice(0,12).join('\n  '):'なし');
  await b.close();srv.close();console.log(bad?'NG '+bad+'件':'すべてOK');process.exit(bad?1:0)})().catch(e=>{console.log('失敗',e);process.exit(2)});
