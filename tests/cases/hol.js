// 祝日の週(曜日を1日ずつずらす・収まらなければ等分)と休日の上書き
const REPO=require('path').resolve(__dirname,'..','..')+'/';const WORK=process.cwd();
const fs=require('fs'),vm=require('vm');const html=fs.readFileSync(REPO+'index.html','utf8');
const core=html.match(/<script>\s*([\s\S]*?function nrRank[\s\S]*?)<\/script>/)[1];const c={};vm.createContext(c);vm.runInContext(core,c);
const J=JSON.stringify;
for(const y of [2026,2027]){const h=c.nrJpHol(y);console.log(y,Object.keys(h).sort().map(k=>k.slice(5)+h[k]).join(' '))}
// 2026-11-23(月) 勤労感謝の日。週は 11/23〜11/29。業者A=月・水、B=火・木、C=金
const cfg=c.nrCfg({wd:{a:[1,3],b:[2,4],c:[5]}});
console.log('holiday week',c.nrHolWeek('2026-11-23',cfg),'normal week',c.nrHolWeek('2026-11-16',cfg));
const F=(n)=>({floors:{[5]:{h:n,w:n,s:'2026-11-01'}}});
const V={a:F(6),b:F(6),c:F(6)};
const days={'2026-11-24':{cap:6,elev:[1]},'2026-11-25':{cap:6,elev:[1]},'2026-11-26':{cap:6,elev:[1]},'2026-11-27':{cap:6,elev:[1]}};
function run(t,cf){const s=c.nrSimulate(V,days,cf,'2026-11-20',{});const tot={};console.log(t);for(const d of s.dates){console.log(' ',d,s.byDate[d].asg.map(a=>a.vid+'×'+a.units+(a.extra?'(曜日外)':'')).join(' '));s.byDate[d].asg.forEach(a=>tot[a.vid]=(tot[a.vid]||0)+a.units)}console.log('  週合計',J(tot))}
run('祝日の週(1日ずつずらす)',cfg);
run('祝日の扱いを止めた(曜日どおり)',c.nrCfg({eq:false,wd:{a:[1,3],b:[2,4],c:[5]}}));
// 祝日でない週は従来どおり
const d2={'2026-11-17':{cap:6,elev:[1]},'2026-11-18':{cap:6,elev:[1]},'2026-11-19':{cap:6,elev:[1]},'2026-11-20':{cap:6,elev:[1]}};
const s2=c.nrSimulate(V,d2,cfg,'2026-11-16',{});for(const d of s2.dates)console.log('通常週',d,s2.byDate[d].asg.map(a=>a.vid+'×'+a.units).join(' '));
// 需要が少ない業者がいる場合
const V3={a:F(2),b:F(9),c:F(9)};const s3=c.nrSimulate(V3,days,cfg,'2026-11-20',{});for(const d of s3.dates)console.log('少なめ業者',d,s3.byDate[d].asg.map(a=>a.vid+'×'+a.units).join(' '));
// 休日の上書き: 11/23 を回収する日に
const cf4=c.nrCfg({wd:{a:[1,3]},holx:{'2026-11-23':0,'2026-11-25':'会社休日'}});console.log('override',c.nrHolName('2026-11-23',cf4)||'(なし)',c.nrHolName('2026-11-25',cf4));
