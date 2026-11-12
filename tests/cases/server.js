// サーバー側(毎朝の自動処理・通知・メール)を、偽のFirebase・通知・メールで最後まで動かす
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const X=path.join(WORK,'srv');fs.rmSync(X,{recursive:true,force:true});fs.mkdirSync(X+'/server/node_modules',{recursive:true});
fs.copyFileSync(REPO+'index.html',X+'/index.html');for(const f of fs.readdirSync(REPO+'server'))if(f.endsWith('.mjs'))fs.copyFileSync(REPO+'server/'+f,X+'/server/'+f);
fs.cpSync(REPO+'tests/lib/server-stubs',X+'/server/node_modules',{recursive:true});
const D=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const wd=n=>new Date(D(n)+'T12:00').getDay(),now=new Date().toISOString();
const app={config:{main:{evn:2,auto:2,wdFrom:'',wd:{v1:[wd(2)],v2:[wd(4)],v3:[wd(3)]},mailAdmins:['kowa0371@gmail.com']}},
 approved:{v1:{company:'サンユー',vid:'v1',email:'a@x.jp'},v2:{company:'日本建工',vid:'v2',email:'b@x.jp'},v3:{company:'鉱工産業',vid:'v3',email:'c@x.jp'}},
 crews:{c1:{company:'盛替A',email:'cr@x.jp'}},members:{},blocked:{},plans:{},orders:{},notices:{},codes:{},crewreq:{},crewblocked:{},seen:{},maillog:{},
 vendors:{v1:{floors:{17:{h:10,w:6,s:D(-5)}}},v2:{floors:{24:{h:5,w:0}}},v3:{floors:{13:{h:4,w:0}}}},
 days:{[D(2)]:{cap:8,elev:[1],tf:'18:00',moves:{'v1|5':{ev:2,to:6,u:2,at:now,md:D(1)}}},[D(3)]:{cap:8,elev:[1]},[D(4)]:{cap:8,elev:[1]},[D(1)]:{cap:4,elev:[1],tf:'09:00'}},
 confirmed:{[D(1)]:{rows:[{vid:'v1',floor:17,units:2,ev:1,n:'サンユー'}],at:now}},
 push:{v1:{kind:'vendor',subs:{s1:{endpoint:'https://push/ok-v1',keys:{}},s2:{endpoint:'https://push/gone-v1',keys:{}}}},c1:{kind:'crew',subs:{s3:{endpoint:'https://push/ok-c1',keys:{}}}},g1:{kind:'admin',subs:{s4:{endpoint:'https://push/ok-admin',keys:{}}}}},outbox:{}};
const db={};for(const [c,v] of Object.entries(app)){db[c]=v;db['scrap_'+c]=c==='config'?{main:{evn:2}}:{}}
fs.writeFileSync(X+'/db.json',JSON.stringify(db));
const env={...process.env,FAKE_DB:X+'/db.json',FIREBASE_SERVICE_ACCOUNT:'{"x":1}',WAIT_UNTIL_TIME:'0'};
const run=(f,e)=>{const o=execFileSync(process.execPath,[X+'/server/'+f],{env:{...env,...(e||{})},encoding:'utf8'});console.log('== '+f+(e&&e.MAIL_MODE?' '+e.MAIL_MODE:'')+'\n'+o.trim())};
run('daily.mjs');run('notify.mjs');
const d=JSON.parse(fs.readFileSync(X+'/db.json'));d.outbox={a1:{to:'admin',msg:'追加注文: テスト',at:now,uid:'v1'},m1:{to:'vendor',vid:'v2',msg:'管理者から: テスト',at:now,uid:'g1'},x1:{to:'vendor',vid:'v2',msg:'なりすまし(送らない)',at:now,uid:'v1'},old:{to:'admin',msg:'古い(送らない)',at:'2020-01-01T00:00:00Z',uid:'v1'}};fs.writeFileSync(X+'/db.json',JSON.stringify(d));
run('notify.mjs',{MAIL_USER:'me@x.jp',MAIL_PASS:'p'});
run('mail.mjs',{MAIL_MODE:'pre',MAIL_USER:'me@x.jp',MAIL_PASS:'p'});run('mail.mjs',{MAIL_MODE:'pre',MAIL_USER:'me@x.jp',MAIL_PASS:'p'});
