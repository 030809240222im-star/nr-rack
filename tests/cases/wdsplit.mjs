// 曜日の担当業者で均等割り、余りは逼迫順
import fs from "node:fs";import vm from "node:vm";
const html=fs.readFileSync(new URL("../../index.html",import.meta.url).pathname,"utf8");
const core=html.match(/<script>\s*([\s\S]*?function nrRank[\s\S]*?)<\/script>/)[1];
const c={};vm.createContext(c);vm.runInContext(core,c);
const cfg=c.nrCfg({evn:2,ev:{1:[1,30],2:[1,30]},wd:{a:[2],b:[2],x:[2],e:[4]},eq:false});
const mk=(h,w,f)=>({floors:{[f]:{h,w,s:"2026-11-01"}}});
const am={x:{floors:{}},a:mk(20,20,10),b:mk(20,20,11),e:mk(20,20,13),f:mk(20,20,14),g:mk(8,8,15)};
const days={"2026-11-17":{cap:12,elev:[1]},"2026-11-20":{cap:6,elev:[1]},"2026-11-12":{cap:6,elev:[1]}};
const r=c.nrSimulate(am,days,cfg,"2026-11-11",{});
for(const d of Object.keys(r.byDate))console.log(d,JSON.stringify(r.byDate[d].asg.map(a=>[a.vid,a.units,a.extra,a.sc.crit?"crit":Math.round(a.sc.pr)])));
