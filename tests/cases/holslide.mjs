// 祝日がある週は業者の曜日を1日ずつずらす。収まらないときは全業者に等分
const html=(await import("node:fs")).readFileSync(new URL("../../index.html",import.meta.url).pathname,"utf8");
const vm=await import("node:vm");const core=html.match(/<script>\s*([\s\S]*?function nrRank[\s\S]*?)<\/script>/)[1];
const c={};vm.createContext(c);vm.runInContext(core,c);
const mk=(f)=>({floors:{[f]:{h:20,w:20,s:"2026-11-01"}}});
const am={mon:mk(10),tue:mk(11),wed:mk(12),thu:mk(13)};
const run=(title,wd,days)=>{const cfg=c.nrCfg({evn:1,ev:{1:[1,30]},wd,wdFrom:"2026-11-16"});
  const r=c.nrSimulate(JSON.parse(JSON.stringify(am)),days,cfg,"2026-11-20",{});
  console.log(title);for(const d of Object.keys(r.byDate).sort())console.log(" ",d,["日","月","火","水","木","金","土"][new Date(d+"T12:00").getDay()],r.byDate[d].eq?"等分":"",JSON.stringify(r.byDate[d].asg.map(a=>[a.vid,a.units])));};
const wk={"2026-11-24":{cap:4,elev:[1]},"2026-11-25":{cap:4,elev:[1]},"2026-11-26":{cap:4,elev:[1]},"2026-11-27":{cap:4,elev:[1]}};
// 11/23(月)勤労感謝の日: 月→火・火→水・水→木・木→金 で収まる
run("月〜木の業者・11/23(月)祝日 → 1日ずつずらす",{mon:[1],tue:[2],wed:[3],thu:[4]},wk);
// 金曜にも業者がいると、金→土で土曜は可。さらに土曜の業者がいると日曜になり収まらない → 等分
run("土曜の業者もいる → 収まらないので等分",{mon:[1],tue:[2],wed:[3],thu:[6]},{...wk,"2026-11-28":{cap:4,elev:[1]}});
console.log("ずらし表(11/23の週):",JSON.stringify(c.nrSlide("2026-11-23",c.nrCfg({wd:{mon:[1],tue:[2],wed:[3],thu:[4]}}))));
