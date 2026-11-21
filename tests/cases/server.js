// サーバー側(毎朝の自動処理・通知・メール)を、偽のFirebase・通知・メールで最後まで動かす
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const X=path.join(WORK,'srv');fs.rmSync(X,{recursive:true,force:true});fs.mkdirSync(X+'/server/node_modules',{recursive:true});
fs.copyFileSync(REPO+'index.html',X+'/index.html');for(const f of fs.readdirSync(REPO+'server'))if(f.endsWith('.mjs'))fs.copyFileSync(REPO+'server/'+f,X+'/server/'+f);
fs.cpSync(REPO+'tests/lib/server-stubs',X+'/server/node_modules',{recursive:true});
const D=n=>{const d=new Date(Date.now()-6*36e5+n*864e5)/* 1日の始まり(6時)にそろえる */;return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const wd=n=>new Date(D(n)+'T12:00').getDay(),now=new Date().toISOString();
const app={config:{main:{evn:2,auto:2,wdFrom:'',wd:{v1:[wd(2)],v2:[wd(4)],v3:[wd(3)]},mailAdmins:['kowa0371@gmail.com']}},
 approved:{v1:{company:'サンユー',vid:'v1',email:'a@x.jp'},v2:{company:'日本建工',vid:'v2',email:'b@x.jp'},v3:{company:'鉱工産業',vid:'v3',email:'c@x.jp'}},
 crews:{c1:{company:'盛替A',email:'cr@x.jp'}},members:{},blocked:{},plans:{},orders:{},notices:{},codes:{},crewreq:{},crewblocked:{},seen:{},maillog:{},
 vendors:{v1:{floors:{17:{h:10,w:6,s:D(-5)}}},v2:{floors:{24:{h:5,w:0}}},v3:{floors:{13:{h:4,w:0}}}},
 days:{[D(2)]:{cap:8,elev:[1],tf:'18:00',moves:{'v1|5':{ev:2,to:6,u:2,at:now,md:D(1)}}},[D(3)]:{cap:8,elev:[1]},[D(4)]:{cap:8,elev:[1]},[D(1)]:{cap:4,elev:[1],tf:'09:00'}},
 confirmed:{[D(1)]:{rows:[{vid:'v1',floor:17,units:2,ev:1,n:'サンユー'}],at:now}},
 push:{v1:{kind:'vendor',subs:{s1:{endpoint:'https://push/ok-v1',keys:{}},s2:{endpoint:'https://push/gone-v1',keys:{}}}},c1:{kind:'crew',subs:{s3:{endpoint:'https://push/ok-c1',keys:{}}}},g1:{kind:'admin',subs:{s4:{endpoint:'https://push/ok-admin',keys:{}}}}},outbox:{}};
/* 古いお知らせ(40日前)と新しいお知らせ。毎朝の自動処理が古いものだけ片づける */
const old=new Date(Date.now()-40*864e5).toISOString();
app.notices={v1:{items:{o1:{d:D(-40),kind:'change',msg:'古い',at:old},n1:{d:D(1),kind:'change',msg:'新しい',at:now},f1:{d:D(3),kind:'remind',msg:'先の日付',at:old}},ack:{o1:now,n1:now}}};
app.seen={v1:{at:now,email:'a@x.jp',kind:'vendor',wd:{old111:{d:'2026-01-01',n:5},new222:{d:'2099-01-01',n:1}}}};
app.inbox={admin:{items:{o2:{msg:'古い連絡',at:old},n2:{msg:'新しい連絡',at:now}},ack:{o2:now}}};
const db={};for(const [c,v] of Object.entries(app)){db[c]=v;db['scrap_'+c]=c==='config'?{main:{evn:2}}:{}}
fs.writeFileSync(X+'/db.json',JSON.stringify(db));
const env={...process.env,FAKE_DB:X+'/db.json',FIREBASE_SERVICE_ACCOUNT:'{"x":1}',WAIT_UNTIL_TIME:'0'};
const run=(f,e)=>{const o=execFileSync(process.execPath,[X+'/server/'+f],{env:{...env,...(e||{})},encoding:'utf8'});console.log('== '+f+(e&&e.MAIL_MODE?' '+e.MAIL_MODE:'')+'\n'+o.trim())};
/* LINE は1日1回だけ: 毎朝の自動処理が2回動いても(GitHub の時刻起動と cron-job.org の両方)、2回目は送らない。LINE への送信は偽物に置き換える */
fs.writeFileSync(X+'/fetchstub.mjs',"globalThis.fetch=async(u)=>{console.log('偽LINE: '+u);return {ok:true,status:200,text:async()=>''}};");
const line={LINE_CHANNEL_TOKEN:'t',NODE_OPTIONS:'--import '+X+'/fetchstub.mjs'};
run('daily.mjs',line);run('daily.mjs',line);
{const a=JSON.parse(fs.readFileSync(X+'/db.json'));console.log('片づけたあとのお知らせ:',Object.keys(a.notices.v1.items).sort().join(','),'/ 確認:',Object.keys(a.notices.v1.ack).join(','),'/ 連絡:',Object.keys(a.inbox.admin.items).join(','),'(o1・o2 が消え、n1・f1・n2 が残る)');console.log('端末ごとの記録の片づけ:',Object.keys(a.seen.v1.wd||{}).join(','),'(old111 が消え、new222 が残る)')}
/* 使用量: 使用量を読める(モニタリング閲覧者)とき、7割を超えたら管理者に1回だけ知らせる。Google Cloud への問い合わせは偽物 */
fs.writeFileSync(X+'/monstub.mjs',"globalThis.fetch=async(u)=>{u=String(u);const j=u.includes('metricDescriptors')?{metricDescriptors:[{type:'firestore.googleapis.com/api/billable_write_units',metricKind:'DELTA',valueType:'INT64'},{type:'firestore.googleapis.com/api/billable_read_units',metricKind:'DELTA',valueType:'INT64'}]}:{timeSeries:[{points:[{interval:{endTime:'2026-11-20T01:00:00Z'},value:{int64Value:u.includes('write')?'31000':'12000'}}]}]};return {ok:true,status:200,json:async()=>j,text:async()=>JSON.stringify(j)}};");
const mon={FAKE_TOKEN:'1',FIREBASE_SERVICE_ACCOUNT:'{"project_id":"p"}',NODE_OPTIONS:'--import '+X+'/monstub.mjs'};
run('daily.mjs',mon);run('daily.mjs',mon);
{const a=JSON.parse(fs.readFileSync(X+'/db.json'));const u=Object.keys(a.outbox||{}).filter(k=>k.startsWith('usage-'));console.log('使用量の知らせ:',u.length,'件(1件=1日1回) /',u.length?a.outbox[u[0]].to+' '+a.outbox[u[0]].msg.slice(0,60):'')}
run('notify.mjs');
const d=JSON.parse(fs.readFileSync(X+'/db.json'));d.outbox={a1:{to:'admin',msg:'追加注文: テスト',at:now,uid:'v1'},m1:{to:'vendor',vid:'v2',msg:'管理者から: テスト',at:now,uid:'g1'},x1:{to:'vendor',vid:'v2',msg:'なりすまし(送らない)',at:now,uid:'v1'},old:{to:'admin',msg:'古い(送らない)',at:'2020-01-01T00:00:00Z',uid:'v1'}};fs.writeFileSync(X+'/db.json',JSON.stringify(d));
run('notify.mjs',{MAIL_USER:'me@x.jp',MAIL_PASS:'p'});
run('mail.mjs',{MAIL_MODE:'pre',MAIL_USER:'me@x.jp',MAIL_PASS:'p'});run('mail.mjs',{MAIL_MODE:'pre',MAIL_USER:'me@x.jp',MAIL_PASS:'p'});
