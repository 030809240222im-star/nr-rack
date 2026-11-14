// 曜日の担当業者の台数(スリーティーが出したい5台なのに2台だった件の検証)
import fs from "node:fs";import vm from "node:vm";
const html=fs.readFileSync(new URL("../../index.html",import.meta.url).pathname,"utf8");
const c={};vm.createContext(c);vm.runInContext(html.match(/<script>\s*([\s\S]*?function nrRank[\s\S]*?)<\/script>/)[1],c);
let bad=0;const eq=(a,b,m)=>{const ok=JSON.stringify(a)===JSON.stringify(b);if(!ok)bad++;console.log((ok?"OK ":"NG ")+m+": "+JSON.stringify(a))};
const fl=(o)=>{const f={};Object.keys(o).forEach(k=>{f[k]={h:o[k][0],w:o[k][1],s:"2026-11-01"}});return {floors:f}};
const tot=(r,d)=>{const g={};r.byDate[d].asg.forEach(x=>{g[x.vid]=(g[x.vid]||0)+x.units});return g};
const W="2026-11-18";/* 水曜 */
// A: 1社あたり4台・積載8台・担当4社 → 今までは2台ずつ。直したあと: 逼迫している業者から4台ずつ
const cA=c.nrCfg({evn:1,ev:{1:[1,40]},wd:{t:[3],a:[3],b:[3],e:[3]},wper:{3:4},eq:false,wdFrom:""});
const amA={t:fl({9:[5,5]}),a:fl({10:[20,6]}),b:fl({11:[20,6]}),e:fl({12:[20,6]})};
const rA=c.nrSimulate(amA,{[W]:{cap:8,elev:[1]}},cA,"2026-11-14",{});
eq(tot(rA,W),{t:4,a:4},"A 1社4台・積載8台・担当4社: 逼迫している2社に4台ずつ(スリーティーは余力なしで最優先)");
// B: スリーティーの3台が、この日のEVが停まらない階(6階) → 2台。内訳に理由が出る
const cB=c.nrCfg({evn:2,ev:{1:[1,40],2:[1,40]},ns:{1:"6"},wd:{t:[3]},eq:false,wdFrom:""});
const rB=c.nrSimulate({t:fl({6:[3,3],9:[2,2]}),x:fl({20:[9,9]})},{[W]:{cap:8,elev:[1]}},cB,"2026-11-14",{});
const xB=rB.byDate[W].wdx.t;eq([tot(rB,W).t,xB.excl],[2,3],"B 6階(EV1が停まらない)の3台は入らず2台。内訳: EVが停まらない3台");
// C: 前の回収日(月曜)に余りとして3台回収済み → 水曜は残りの2台
const cC=c.nrCfg({evn:1,ev:{1:[1,40]},wd:{t:[3],m:[1]},eq:false,wdFrom:""});
const rC=c.nrSimulate({t:fl({9:[5,5]}),m:fl({10:[1,1]})},{"2026-11-16":{cap:4,elev:[1]},[W]:{cap:8,elev:[1]}},cC,"2026-11-14",{});
eq([tot(rC,"2026-11-16").t,tot(rC,W).t,rC.byDate[W].wdx.t.earlier],[3,2,3],"C 月曜の余りで3台回収 → 水曜は2台。内訳: 前の回収日3台");
// D: 保有が出したいより少ない(保有2・出したい5)
const rD=c.nrSimulate({t:fl({9:[2,5]})},{[W]:{cap:8,elev:[1]}},c.nrCfg({evn:1,ev:{1:[1,40]},wd:{t:[3]},eq:false,wdFrom:""}),"2026-11-14",{});
eq([tot(rD,W).t,rD.byDate[W].wdx.t.want-rD.byDate[W].wdx.t.held],[2,3],"D 保有2台・出したい5台 → 2台。内訳: 保有より多い3台");
// E: 1社あたりの台数を決めていない日は今までどおり均等(積載8・担当4社 → 2台ずつ)
const rE=c.nrSimulate(amA,{[W]:{cap:8,elev:[1]}},c.nrCfg({evn:1,ev:{1:[1,40]},wd:{t:[3],a:[3],b:[3],e:[3]},eq:false,wdFrom:""}),"2026-11-14",{});
eq(tot(rE,W),{t:2,a:2,b:2,e:2},"E 1社あたりを決めていない日は均等割り(2台ずつ)。内訳: 枠2台");
console.log(bad?"NG "+bad+"件":"すべてOK");if(bad)process.exit(1);
