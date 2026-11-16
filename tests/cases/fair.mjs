// 業者ごとの公平さ: 保有の多い階に分かれてたくさん待っている業者が、逼迫度が低いために後回しにならない
import fs from "node:fs";import vm from "node:vm";
const html=fs.readFileSync(new URL("../../index.html",import.meta.url).pathname,"utf8");
const c={};vm.createContext(c);vm.runInContext(html.match(/<script>\s*([\s\S]*?function nrRank[\s\S]*?)<\/script>/)[1],c);
let bad=0;const eq=(a,b,m)=>{const ok=JSON.stringify(a)===JSON.stringify(b);if(!ok)bad++;console.log((ok?"OK ":"NG ")+m+": "+JSON.stringify(a)+(ok?"":" (期待 "+JSON.stringify(b)+")"))};
const fl=(o)=>{const f={};Object.keys(o).forEach(k=>{const x=o[k];f[k]={h:x[0],w:x[1],s:x[2]||"2026-11-12"}});return {floors:f}};
const tot=(r,d)=>{const g={};r.byDate[d].asg.forEach(x=>{g[x.vid]=(g[x.vid]||0)+x.units});return g};
const vorder=(R)=>{const o=[];R.list.forEach(x=>{if(o.indexOf(x.vid)<0)o.push(x.vid)});return o};
const W="2026-11-18",T="2026-11-16";
// B: 4つの階に保有25台ずつ、合わせて22台待ち(逼迫度は各階22%)。S1〜S3: 保有5台で4台待ち(80%)
const am={B:fl({10:[25,6],11:[25,6],12:[25,5],13:[25,5]}),S1:fl({20:[5,4]}),S2:fl({21:[5,4]}),S3:fl({22:[5,4]})};
const base={evn:1,ev:{1:[1,40]},eq:false,wdFrom:""};
const run=(x,cap)=>{const cfg=c.nrCfg(Object.assign({},base,x));const r=c.nrSimulate(am,{[W]:{cap:cap||8,elev:[1]}},cfg,T,{});return [vorder(c.nrRank(am,r,cfg,T)),tot(r,W),c.nrRank(am,r,cfg,T)]};
const [o0,g0]=run({wQ:0});
eq([o0,g0],[["S1","S2","S3","B"],{S1:4,S2:4}],"待ち台数の重み0(今までと同じ): 22台待ちのBが最後。積載8台はS1・S2へ");
const [o1,g1,R1]=run({});
eq([o1,g1],[["B","S1","S2","S3"],{B:8}],"初期値(待ち台数×5): Bが1位。積載8台はB(22台待ち)の2つの階へ");
eq(R1.list[0].sc.q,22,"Bの「業者の待ち」は22台(全部の階の合計)");
// 1つ入れるたびに業者の待ち台数を減らして並べ直す: B(10台待ち)が6台出すと残り4台 → 次は4台待ちのS1
const am3={B:fl({10:[25,6],11:[25,4]}),S1:fl({20:[5,4]}),S2:fl({21:[5,4]})};
const cf3=c.nrCfg(base),r3=c.nrSimulate(am3,{[W]:{cap:8,elev:[1]}},cf3,T,{});
eq([vorder(c.nrRank(am3,r3,cf3,T)),r3.byDate[W].asg.map(a=>a.vid+a.floor+":"+a.units)],[["B","S1","S2"],["B10:6","S120:2"]],"Bの1つ目の階(6台)のあと、Bは残り4台待ちになり、S1が先(1つの業者が積載を独り占めしない)");
// 余力なし(100%)の小さい階は、最優先の設定なら先。外すと評価点の順
const am2={B:am.B,S:fl({30:[3,3]})};
const r2=(x)=>{const cfg=c.nrCfg(Object.assign({},base,x));return vorder(c.nrRank(am2,c.nrSimulate(am2,{[W]:{cap:8,elev:[1]}},cfg,T,{}),cfg,T))};
eq([r2({}),r2({critTop:false})],[["S","B"],["B","S"]],"余力なしを最優先にする(初期値)ならS(3台)が先。外すとBが先");
eq(c.nrCfg({}).critTop,true,"余力なしを最優先にするのが初期値");
console.log(bad?"NG "+bad+"件":"すべてOK");if(bad)process.exit(1);
