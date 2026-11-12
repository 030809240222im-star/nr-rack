// 全画面・全ボタンを押して回る(管理者・業者・盛替え業者 × 簡単/詳しい表示 × スマホ/iPad/パソコン)。画面のエラーとはみ出しを数える
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const {chromium,devices}=require('playwright');const fs=require('fs');
fs.writeFileSync('main-test.html',fs.readFileSync(REPO+'index.html','utf8'));
fs.writeFileSync('crew-test.html',fs.readFileSync(REPO+'crew/index.html','utf8'));
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const now=new Date().toISOString();
const FS={config:{main:{evn:3,ev:{1:[1,30],2:[1,30],3:[1,30]},ns:{1:'5,6'},auto:2,wd:{v1:[new Date(D(2)+'T12:00').getDay()],v2:[new Date(D(4)+'T12:00').getDay()]},crewMsgs:[{at:now,msg:'テスト連絡'}]}},
 approved:{v1:{company:'サンユー',vid:'v1',email:'a@x.jp'},v2:{company:'日本建工',vid:'v2'},v3:{company:'鉱工産業',vid:'v3'},u9:{company:'新規',vid:'u9'}},
 members:{m9:{company:'未承認',email:'m@x.jp',at:now}},crews:{c1:{company:'盛替A',email:'c@x.jp'}},crewreq:{c9:{company:'盛替B',email:'b@x.jp',at:now}},
 vendors:{v1:{code:'AB12CD',floors:{17:{h:14,w:10,p:1,pq:4},21:{h:6,w:2,same:false,rs:[{f:20,u:1},{f:22,u:1}]},5:{h:4,w:4}},placed:{[D(0)+'|17']:{at:now,ev:1}}},v2:{floors:{24:{h:8,w:4}}},v3:{floors:{13:{h:6,w:3},6:{h:3,w:2}}},vm:{name:'手入力業者',manual:true,floors:{9:{h:2,w:1}}}},
 days:{[D(0)]:{cap:12,elev:[1],tf:'18:00',tt:'19:00'},[D(2)]:{cap:8,elev:[1,2],moves:{'v3|6':{ev:2,to:6,u:2,at:now,md:D(1)}}},[D(4)]:{cap:8,elev:[1]},[D(-3)]:{cap:8,elev:[1]}},
 confirmed:{[D(0)]:{rows:[{vid:'v1',floor:17,units:4,ev:1,n:'サンユー'},{vid:'v3',floor:13,units:3,ev:1,n:'鉱工産業',ret:20},{vid:'v2',floor:24,units:4,ev:1,n:'日本建工'}],at:now,hist:[{at:now,by:'g',t:'確定'}],st:{'v3|13|1':{chk:{k:'short',got:2,at:now,by:'c'}}}},
   [D(-3)]:{rows:[{vid:'v1',floor:21,units:2,ev:1,n:'サンユー',rets:[{f:20,u:1},{f:22,u:1}]}],at:now,st:{'v1|21|1':{back:{ev:1,u:2,at:now,adj:{}}}}}},
 orders:{v2:{items:{o1:{f:25,u:4,st:'plan',plan:{d:D(0)},n:'日本建工',at:now},o2:{f:12,u:2,st:'new',n:'日本建工',at:now},o3:{f:11,u:1,st:'done',plan:{d:D(-3)},done:{d:D(-3),ev:1,u:1},n:'日本建工',at:now}}}},
 notices:{v1:{items:{a1:{d:D(0),kind:'confirm',msg:'確定しました',at:now},a2:{d:D(2),kind:'remind',msg:'【入力のお願い】…',at:now},a3:{d:D(0),kind:'msg',msg:'連絡です',at:now}}}},
 plans:{v1:{logs:[{id:'l1',d:D(-3),f:17,u:2,m:'追加'}]}}};
const SKIP=/^(simple|logout|reload|resetall|sampleoff|sampleon|demoreset|push|pvon|pvoff|vdel|copyurl|csv|backup|dayoff|unconfirm)$/;
(async()=>{const b=await chromium.launch();let total=0,clicks=0;const problems=[];
for(const who of [{uid:'g1',email:'kowa0371@gmail.com',f:'main-test.html',n:'管理者'},{uid:'v1',email:'a@x.jp',f:'main-test.html',n:'業者'},{uid:'c1',email:'c@x.jp',f:'crew-test.html',n:'盛替え'}])
for(const simple of [true,false])
for(const [dn,dev] of [['スマホ',devices['iPhone 13']],['PC',{viewport:{width:1280,height:900}}]]){
  const cx=await b.newContext(dev);await cx.addInitScript(v=>{try{localStorage.setItem('nr-uipref',JSON.stringify({simple:v}))}catch(e){}},simple);
  await cx.route(/gstatic\.com\/firebasejs/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('fake-fb.js','utf8')}));
  await cx.route(/jsdelivr/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('qrcode.min.js','utf8')}));
  await cx.addInitScript(w=>{window.__FAKE_UID=w.uid;window.__FAKE_EMAIL=w.email;window.__FS=w.FS},{uid:who.uid,email:who.email,FS});
  const p=await cx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/favicon|net::/.test(m.text()))errs.push('console: '+m.text().slice(0,120))});
  await p.goto('file://'+WORK+'/'+who.f);await p.click('#lg-google');await p.waitForTimeout(700);
  const label=who.n+'/'+(simple?'簡単':'詳しい')+'/'+dn;
  const tabs=await p.locator('.tabs button').evaluateAll(bs=>bs.map(x=>[x.dataset.act,x.dataset.tab]));
  const visit=tabs.length?tabs:[[null,null]];
  for(const [act,tab] of visit){
    const go=async()=>{if(tab)await p.click(`.tabs button[data-tab="${tab}"]`).catch(()=>{});await p.waitForTimeout(80)};
    await go();
    // カレンダーの日を全部押す
    const days=await p.locator('[data-act=sel]').evaluateAll(x=>x.map(e=>e.dataset.date));
    for(const d of days.slice(0,12)){await p.click(`[data-act=sel][data-date="${d}"]`).catch(()=>{});clicks++}
    // 画面のボタンを全部押す(押すたびに元の画面に戻る)
    const acts=await p.locator('button[data-act]').evaluateAll(bs=>bs.map((x,i)=>[x.dataset.act,i]));
    const seenA={};
    for(const [a,i] of acts){if(SKIP.test(a)||a==='tab'||a==='stab'||a==='sel'||seenA[a])continue;seenA[a]=1;/* 同じ種類のボタンは1画面に1回 */
      const btn=p.locator('button[data-act]').nth(i);if(await btn.count()===0)continue;
      if((await btn.getAttribute('data-act'))!==a)continue;
      await btn.click({timeout:600}).catch(()=>{});clicks++;await p.waitForTimeout(30);
      const sw=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);if(sw>1)problems.push(label+' '+(tab||'')+' '+a+' はみ出し '+sw+'px');
      await go()}
  }
  console.log(label+': ボタン・日付を押した数 '+clicks+(errs.length?' エラー'+errs.length:''));
  total+=errs.length;if(errs.length)problems.push(label+': '+[...new Set(errs)].slice(0,5).join(' | '));
  await cx.close();
}
await b.close();
console.log('押したボタンと日付: '+clicks+'回');console.log(problems.length?problems.join('\n'):'エラーなし・はみ出しなし');})();
