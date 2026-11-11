/* プッシュ通知(GitHub Actions から5分ごとに動かす)
   前回送ったあとに起きたことを、通知を許可した端末へ送る。
   - 業者: その会社へのお知らせ(確定・変更・取りやめ・搬出確認の「無い」「不足」など)
   - 盛替え業者: 回収日の確定・変更、盛替え(集積)の指示
   - 管理者: 新しい追加注文、新しい利用申請(業者・盛替え業者)、搬出確認の「無い」「不足」
   通知の鍵(VAPID)は最初の実行で作り、Firestore の pushkeys/main(アプリからは読めない)に保存する。
   公開鍵だけを config/main.vapid(と scrap_config/main.vapid)に書き、アプリはそれを使って端末を登録する。
   端末の登録は push/{利用者}.subs(スクラップ版は scrap_push)。届かなくなった端末は消す。 */
import fs from "node:fs";
import vm from "node:vm";
import admin from "firebase-admin";
import webpush from "web-push";

const root = new URL("..", import.meta.url).pathname;
const html = fs.readFileSync(root + "index.html", "utf8");
const core = html.match(/<script>\s*([\s\S]*?function nrRank[\s\S]*?)<\/script>/)[1];
const ctx = {}; vm.createContext(ctx); vm.runInContext(core, ctx);
const { nrPd, nrNum, nrBase } = ctx;
const ADMINS = JSON.parse((html.match(/adminEmails:(\[[^\]]*\])/) || [])[1] || "[]").map(e => e.toLowerCase());

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "null");
if (!sa) { console.log("FIREBASE_SERVICE_ACCOUNT がないので終了します"); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
const db = getFirestore(admin.app(), process.env.FIRESTORE_DB || "default");

const APP_URL = "https://030809240222im-star.github.io/nr-rack/";
const APPS = [{ prefix: "", name: "NRボックス", url: APP_URL }, { prefix: "scrap_", name: "スクラップ", url: APP_URL + "scrap/" }];
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const fmtD = s => { const d = nrPd(s); return (d.getMonth() + 1) + "/" + d.getDate() + "(" + WD[d.getDay()] + ")"; };
const now = new Date(), nowIso = now.toISOString();

/* 鍵: なければ作って保存。公開鍵は両方のアプリの設定に書く(同じ端末の登録を2つのアプリで共有するため、鍵は1組) */
const keyRef = db.doc("pushkeys/main");
let keys = (await keyRef.get()).data();
if (!keys || !keys.pub || !keys.priv) { const k = webpush.generateVAPIDKeys(); keys = { pub: k.publicKey, priv: k.privateKey, at: nowIso }; await keyRef.set(keys); console.log("通知の鍵を作りました"); }
webpush.setVapidDetails("mailto:noreply@example.com", keys.pub, keys.priv);
for (const app of APPS) {
  const c = (await db.doc(app.prefix + "config/main").get()).data() || {};
  if (c.vapid !== keys.pub) await db.doc(app.prefix + "config/main").set({ vapid: keys.pub }, { merge: true });
}

const emailCache = {};
async function userEmail(uid) {
  if (uid in emailCache) return emailCache[uid];
  try { const u = await admin.auth().getUser(uid); emailCache[uid] = u.emailVerified ? String(u.email || "").toLowerCase() : ""; } catch (e) { emailCache[uid] = ""; }
  return emailCache[uid];
}
async function load(prefix, c) { const m = {}; (await db.collection(prefix + c).get()).forEach(d => { m[d.id] = d.data(); }); return m; }

let sent = 0, gone = 0, failed = 0;
for (const app of APPS) {
  const P = app.prefix;
  const [push, notices, days, confirmed, orders, members, approved, crews, crewreq, vendors] = await Promise.all(
    ["push", "notices", "days", "confirmed", "orders", "members", "approved", "crews", "crewreq", "vendors"].map(c => load(P, c)));
  if (!Object.keys(push).length) continue;
  const stRef = db.doc(P + "pushlog/state"), st = (await stRef.get()).data() || {};
  /* 初めて動かすときは、30分前より後のことだけを送る(過去の分をまとめて送らない) */
  const since = st.last || new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const after = at => typeof at === "string" && at > since && at <= nowIso;
  const vname = vid => { const m = Object.keys(approved).find(u => (approved[u].vid || u) === vid); return (m && approved[m].company) || (vendors[vid] && vendors[vid].name) || "業者"; };

  /* 誰に何を送るか */
  const forVendor = {}, forCrew = [], forAdmin = [];
  const add = (o, k, m) => { (o[k] = o[k] || []).push(m); };
  const dayChanged = {};
  for (const vid of Object.keys(notices)) {
    const it = notices[vid].items || {};
    for (const id of Object.keys(it)) { const x = it[id]; if (!after(x.at)) continue;
      add(forVendor, vid, x.msg || "お知らせがあります");
      if (x.d && (x.kind === "confirm" || x.kind === "change" || x.kind === "cancel")) dayChanged[x.d] = dayChanged[x.d] || x.kind; }
  }
  Object.keys(dayChanged).sort().forEach(d => forCrew.push(fmtD(nrBase(d)) + " の搬出予定が" + (dayChanged[d] === "confirm" ? "確定しました" : dayChanged[d] === "cancel" ? "取りやめになりました" : "変わりました")));
  for (const d of Object.keys(days).sort()) {
    const mv = days[d].moves || {};
    for (const key of Object.keys(mv)) { const m = mv[key]; if (!after(m.at)) continue; const q = key.split("|");
      forCrew.push("盛替えの指示: " + fmtD(nrBase(d)) + "の回収に向けて " + vname(q[0]) + " " + q[1] + "階" + (nrNum(m.u) ? " " + nrNum(m.u) + "台" : "") + " → 前日までにEV" + nrNum(m.ev) + "前の" + nrNum(m.to) + "階へ"); }
  }
  for (const vid of Object.keys(orders)) { const it = orders[vid].items || {};
    for (const id of Object.keys(it)) { const x = it[id]; if (x.st === "new" && after(x.at)) forAdmin.push("追加注文: " + (x.n || vname(vid)) + " " + x.f + "階に" + nrNum(x.u) + "台"); } }
  for (const id of Object.keys(members)) if (!approved[id] && after(members[id].at)) forAdmin.push("業者の利用申請: " + (members[id].company || ""));
  for (const id of Object.keys(crewreq)) if (!crews[id] && after(crewreq[id].at)) forAdmin.push("盛替え業者の利用申請: " + (crewreq[id].company || ""));
  for (const d of Object.keys(confirmed)) { const s = confirmed[d].st || {};
    for (const rk of Object.keys(s)) { const c = s[rk].chk; if (!c || c.k === "ok" || !after(c.at)) continue; const q = rk.split("|");
      const msg = fmtD(nrBase(d)) + " " + vname(q[0]) + " " + q[1] + "階: " + (c.k === "none" ? "見当たりません" : "不足(" + nrNum(c.got) + "台)");
      forAdmin.push("搬出確認 " + msg); } }

  /* 端末ごとに送る */
  const welcomed = st.welcomed || {};
  const newWelcomed = {};
  for (const uid of Object.keys(push)) {
    const doc = push[uid], subs = doc.subs || {};
    if (!Object.keys(subs).length) continue;
    let msgs = [];
    const email = await userEmail(uid);
    if (doc.kind === "admin") { if (ADMINS.includes(email)) msgs = forAdmin; }
    else if (doc.kind === "crew") { if (crews[uid]) msgs = forCrew; }
    else if (approved[uid]) msgs = forVendor[approved[uid].vid || uid] || [];
    for (const h of Object.keys(subs)) {
      const sub = subs[h]; if (!sub || !sub.endpoint) continue;
      const list = [];
      if (!welcomed[uid + "|" + h]) { list.push({ title: "【" + app.name + "】通知の設定ができました", body: "この端末で、アプリのお知らせを受け取ります。" }); newWelcomed[uid + "|" + h] = 1; }
      if (msgs.length) list.push({ title: "【" + app.name + "】" + (msgs.length > 1 ? "お知らせ " + msgs.length + "件" : "お知らせ"), body: msgs.slice(0, 6).join("\n") + (msgs.length > 6 ? "\nほか" + (msgs.length - 6) + "件" : "") });
      for (const m of list) {
        try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify({ ...m, url: app.url, tag: app.prefix + "nr" }), { TTL: 6 * 3600 }); sent++; }
        catch (e) {
          if (e && (e.statusCode === 404 || e.statusCode === 410)) { gone++; await db.doc(P + "push/" + uid).update({ ["subs." + h]: FieldValue.delete() }); break; }
          failed++; console.log("送れませんでした: " + (e && (e.statusCode || e.message)));
        }
      }
    }
  }
  await stRef.set({ last: nowIso, welcomed: { ...welcomed, ...newWelcomed } }, { merge: true });
}
console.log("通知: " + sent + "件送りました" + (gone ? "・届かなくなった端末 " + gone + "件を消しました" : "") + (failed ? "・" + failed + "件は送れませんでした" : ""));
