// 土日祝を除いた営業日での確定日・入力のお願い・前日の知らせと、曜日ごとの1社あたりの台数
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
const mk=(h,w,f)=>({floors:{[f]:{h,w,s:"2026-11-01"}}});
// 曜日ごとの1社あたりの台数(業者ごとの台数があればそちら)
const cp=c.nrCfg({evn:1,ev:{1:[1,30]},wd:{a:[2],b:[2]},wper:{2:3},eq:false,wdFrom:""});
const r2=c.nrSimulate({a:mk(20,20,10),b:mk(20,20,11),u:mk(5,5,12)},{"2026-11-17":{cap:12,elev:[1]}},cp,"2026-11-11",{});
const g2={};r2.byDate["2026-11-17"].asg.forEach(x=>{g2[x.vid]=(g2[x.vid]||0)+x.units});
eq(g2,{a:3,b:3,u:5},"火曜1社3台: a・bは3台ずつ、残りは逼迫した業者へ(希望の5台)");
// 1日の始まり(初期値6時): 0時〜5時59分は前の日
eq([c.nrToday(cfg,new Date(2026,10,14,3,0)),c.nrToday(cfg,new Date(2026,10,14,5,59)),c.nrToday(cfg,new Date(2026,10,14,6,0)),c.nrToday(c.nrCfg({dayStart:0}),new Date(2026,10,14,3,0))],["2026-11-13","2026-11-13","2026-11-14","2026-11-14"],"3:00と5:59は前の日、6:00から新しい日。0時に設定すると今までどおり");
console.log(bad?"NG "+bad+"件":"すべてOK");if(bad)process.exit(1);
