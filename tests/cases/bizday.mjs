// 土日祝を除いた営業日での確定日・入力のお願い・前日の知らせと、曜日ごとの業者の最大搬出数
import fs from "node:fs";import vm from "node:vm";
const html=fs.readFileSync(new URL("../../index.html",import.meta.url).pathname,"utf8");
const core=html.match(/<script>\s*([\s\S]*?function nrRank[\s\S]*?)<\/script>/)[1];
const c={};vm.createContext(c);vm.runInContext(core,c);
const cfg=c.nrCfg({});let bad=0;const eq=(a,b,m)=>{const ok=JSON.stringify(a)===JSON.stringify(b);if(!ok)bad++;console.log((ok?"OK ":"NG ")+m+": "+JSON.stringify(a))};
eq(c.nrConfirmDay("2026-11-16",cfg),"2026-11-12","月曜の回収は前の週の木曜に確定");
eq(c.nrConfirmDay("2026-11-19",cfg),"2026-11-17","木曜の回収は火曜に確定");
eq(c.nrConfirmDay("2026-11-24",cfg),"2026-11-19","祝日(11/23)明けの火曜は木曜に確定");
eq(c.nrPreDays("2026-11-13",cfg),["2026-11-14","2026-11-15","2026-11-16"],"金曜の前日の知らせは土・日・月の分");
eq(c.nrPreDays("2026-11-14",cfg),[],"土曜は前日の知らせなし");
eq(c.nrConfirmDay("2026-11-19",c.nrCfg({holx:{"2026-11-17":"会社休み"}})),"2026-11-16","会社の休日も飛ばす");
// 入力のお願い(確定の2営業日前〜)と警告(確定の前の営業日〜)
const cw=c.nrCfg({wd:{a:[1]}}),vs={a:{floors:{}}},days={"2026-11-16":{cap:8,elev:[1]}};
const lv=t=>c.nrRemind(vs,days,{},cw,t).map(x=>x.lv);
eq([lv("2026-11-09"),lv("2026-11-10"),lv("2026-11-11"),lv("2026-11-12")],[[],[1],[2],[]],"月曜の回収: 火曜にお願い・水曜に警告・木曜(確定日)はなし");
// 曜日ごとの最大搬出数
const cm=c.nrCfg({evn:1,ev:{1:[1,30]},wd:{a:[2],b:[2]},wmax:{a:{2:2}},eq:false,wdFrom:""});
const mk=(h,w,f)=>({floors:{[f]:{h,w,s:"2026-11-01"}}});
const am={a:mk(20,20,10),b:mk(20,6,11),u:mk(5,5,12)};
const r=c.nrSimulate(am,{"2026-11-17":{cap:12,elev:[1]}},cm,"2026-11-11",{});
const got={};r.byDate["2026-11-17"].asg.forEach(x=>{got[x.vid]=(got[x.vid]||0)+x.units});
eq(got,{a:2,b:6,u:4},"火曜: aは最大2台、bは均等割り6台まで、残り4台は逼迫した業者へ");
console.log(bad?"NG "+bad+"件":"すべてOK");if(bad)process.exit(1);
