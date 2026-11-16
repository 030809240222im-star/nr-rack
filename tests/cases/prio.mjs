// 業者の優先順位(「優先順位」タブの順)が搬出予定(配分)に反映されること
import fs from "node:fs";import vm from "node:vm";
const html=fs.readFileSync(new URL("../../index.html",import.meta.url).pathname,"utf8");
const c={};vm.createContext(c);vm.runInContext(html.match(/<script>\s*([\s\S]*?function nrRank[\s\S]*?)<\/script>/)[1],c);
let bad=0;const eq=(a,b,m)=>{const ok=JSON.stringify(a)===JSON.stringify(b);if(!ok)bad++;console.log((ok?"OK ":"NG ")+m+": "+JSON.stringify(a)+(ok?"":" (期待 "+JSON.stringify(b)+")"))};
const fl=(o)=>{const f={};Object.keys(o).forEach(k=>{const x=o[k];f[k]={h:x[0],w:x[1],s:x[2]};if(x[3])f[k].p=x[3]});return {floors:f}};
const tot=(r,d)=>{const g={};r.byDate[d].asg.forEach(x=>{g[x.vid]=(g[x.vid]||0)+x.units});return g};
const vorder=(R)=>{const o=[];R.list.forEach(x=>{if(o.indexOf(x.vid)<0)o.push(x.vid)});return o};
const W="2026-11-18",T="2026-11-16";/* 水曜・月曜 */
// 優先順位: A(待機が長い・逼迫度40%) > C > Dv > B(逼迫度80%だが登録したばかり)
const am={A:fl({9:[20,8,"2026-11-01"]}),B:fl({10:[10,8,"2026-11-14"]}),C:fl({11:[10,6,"2026-11-10"]}),Dv:fl({12:[8,6,"2026-11-13"]})};
const wd={A:[3],B:[3],C:[3],Dv:[3]};
const cf1=c.nrCfg({evn:1,ev:{1:[1,40]},wd,wper:{3:4},eq:false,wdFrom:""});
const r1=c.nrSimulate(am,{[W]:{cap:14,elev:[1]}},cf1,T,{});
eq(vorder(c.nrRank(am,r1,cf1,T)),["A","C","Dv","B"],"優先順位タブの業者の順");
eq(tot(r1,W),{A:4,C:4,Dv:4,B:2},"1社4台・積載14台: 優先順位が上の業者から4台ずつ(逼迫度の順ではない)");
const r2=c.nrSimulate(am,{[W]:{cap:14,elev:[1]}},c.nrCfg({evn:1,ev:{1:[1,40]},wd,eq:false,wdFrom:""}),T,{});
eq(tot(r2,W),{A:5,C:3,Dv:3,B:3},"均等割り(3台ずつ)の割り切れない2台は、優先順位1位の業者へ");
// 曜日外の業者に余りを回すときも優先順位の順
const am3={A:fl({9:[20,8,"2026-11-01"]}),B:fl({10:[10,8,"2026-11-14"]}),T:fl({5:[2,2,"2026-11-14"]})};
const r3=c.nrSimulate(am3,{[W]:{cap:8,elev:[1]}},c.nrCfg({evn:1,ev:{1:[1,40]},wd:{T:[3],A:[1],B:[2]},eq:false,wdFrom:""}),T,{});
eq(tot(r3,W),{T:2,A:6},"担当業者の後の余り6台は、逼迫度が高いBではなく、優先順位が上のAへ");
// 業者の「先に出す」(評価点の低い階)を付けても、業者どうしの順は変わらない
const am4={A:fl({9:[20,4,"2026-11-01"],30:[40,4,"2026-11-15",1]}),B:fl({10:[10,8,"2026-11-10"]})};
const cf4=c.nrCfg({evn:1,ev:{1:[1,40]},wd:{A:[3],B:[3]},wper:{3:4},eq:false,wdFrom:""});
const r4=c.nrSimulate(am4,{[W]:{cap:6,elev:[1]}},cf4,T,{});
eq([vorder(c.nrRank(am4,r4,cf4,T)),tot(r4,W),r4.byDate[W].asg.map(a=>a.vid+a.floor)],[["A","B"],{A:4,B:2},["A30","B10"]],"Aの先行(30階)を付けても Aが先に4台(先行の30階から)");
// 確定した日の分を差し引いて順位を出す(基準日はまだ確定していない最初の回収日)
const am5={P:fl({9:[20,10,"2026-11-05"]}),Q:fl({10:[10,6,"2026-11-05"]})};
const cf5=c.nrCfg({evn:1,ev:{1:[1,40]},eq:false,wdFrom:""});
const days5={[T]:{cap:8,elev:[1]},[W]:{cap:4,elev:[1]}},conf5={[T]:{rows:[{vid:"P",floor:9,units:8}]}};
const r5=c.nrSimulate(am5,days5,cf5,T,conf5),R5=c.nrRank(am5,r5,cf5,T);
const R5raw=c.nrRank(am5,c.nrSimulate(am5,{[W]:{cap:4,elev:[1]}},cf5,T,{}),cf5,T);
eq(vorder(R5raw),["P","Q"],"確定した日がなければ P が上(保有20・希望10)");
eq([R5.ref,R5.list.map(x=>x.vid+":"+x.held+"/"+x.rem),vorder(R5),tot(r5,W)],[W,["Q:10/6","P:12/2"],["Q","P"],{Q:4}],"月曜に確定した8台を差し引くと Pは保有12・希望2 → 水曜の順位は Q が上で、配分も Q(順位と配分が同じ)");
const R5b=c.nrRank(am5,c.nrSimulate(am5,days5,cf5,T,{[T]:{rows:[{vid:"P",floor:9,units:10},{vid:"Q",floor:10,units:6}]}}),cf5,T);
eq([R5b.list.length,R5b.done],[0,2],"確定した日で全部出す階は一覧に入れず、件数だけ");
// ランダムに作って確かめる: 優先順位が下の業者が入ったのに、上の業者がまだ出せる台数を残していることがない
let viol=0,runs=0;const rnd=(n)=>Math.floor(Math.random()*n);
for(let t=0;t<400;t++){
  const vs=["a","b","c","d","e","f"].slice(0,2+rnd(5)),am6={},wd6={};
  vs.forEach((v,i)=>{const o={};const n=1+rnd(2);for(let j=0;j<n;j++){const h=1+rnd(12);o[3+i*5+j]=[h,1+rnd(h),"2026-11-"+String(1+rnd(15)).padStart(2,"0")]}am6[v]=fl(o);if(rnd(3))wd6[v]=[3]});
  const per=rnd(2)?{3:1+rnd(5)}:{},cf6=c.nrCfg({evn:1,ev:{1:[1,60]},wd:wd6,wper:per,eq:false,wdFrom:""});
  const r6=c.nrSimulate(am6,{[W]:{cap:2+rnd(20),elev:[1]}},cf6,T,{}),R6=c.nrRank(am6,r6,cf6,T),g=tot(r6,W),ord=vorder(R6);
  const want=(v)=>R6.list.filter(x=>x.vid===v).reduce((s,x)=>s+x.rem,0);
  const ass=ord.filter(v=>wd6[v]),cap=(v)=>per[3]?Math.min(per[3],want(v)):want(v);
  /* 担当業者どうし: 1社あたりの台数を決めた日は、下の業者に入ったのに上の業者がその台数に届いていない、がない */
  if(per[3])for(let i=0;i<ass.length;i++)for(let j=i+1;j<ass.length;j++){if((g[ass[j]]||0)>0&&(g[ass[i]]||0)<cap(ass[i])){viol++;if(viol<4)console.log("  反例",JSON.stringify({am6,wd6,per,g,ord}))}}
  runs++;
}
eq(viol,0,"ランダム"+runs+"件: 1社あたりの台数の日に、優先順位が下の担当業者が先に入っていない");
console.log(bad?"NG "+bad+"件":"すべてOK");if(bad)process.exit(1);
