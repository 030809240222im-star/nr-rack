/* 毎朝の自動処理(GitHub Actions から動かす)
   1. 搬出日の設定日数前(初期値2日前)になった回収日を、アプリと同じ振り分けで確定し、業者にお知らせを出す
   2. 当日・翌日の搬出予定と新しい追加注文を LINE に送る(LINE の設定があるときだけ)
   3. 全データをパスワードで暗号化してバックアップする(BACKUP_PASSWORD があるときだけ)
   振り分けの計算は index.html の最初の <script>(nr で始まる関数)をそのまま読み込んで使う。 */
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import admin from "firebase-admin";

const root = new URL("..", import.meta.url).pathname;
const html = fs.readFileSync(root + "index.html", "utf8");
const core = html.match(/<script>\s*([\s\S]*?function nrRank[\s\S]*?)<\/script>/)[1];
const ctx = {}; vm.createContext(ctx); vm.runInContext(core, ctx);
const { nrCfg, nrSimulate, nrDs, nrPd, nrNum } = ctx;

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "null");
if (!sa) { console.log("FIREBASE_SERVICE_ACCOUNT がないので終了します"); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
const db = getFirestore(admin.app(), process.env.FIRESTORE_DB || "default");

const APPS = [{ prefix: "", name: "NRボックス" }, { prefix: "scrap_", name: "スクラップ" }];
const COLLS = ["config", "days", "vendors", "approved", "blocked", "confirmed", "members", "plans", "orders", "notices", "crews", "crewreq", "crewblocked"];
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const fmtD = s => { const d = nrPd(s); return (d.getMonth() + 1) + "/" + d.getDate() + "(" + WD[d.getDay()] + ")"; };
const fmtTime = d => d && d.tf ? d.tf + "〜" + (d.tt || "") : "時間未定";
const evLabel = (e, to) => e ? (to ? to + "階 EV" + e + "前" : "EV" + e + "前") : "—";
const today = nrDs(new Date());
const backup = {};
const lines = [];

async function load(prefix) {
  const D = {};
  for (const c of COLLS) {
    const snap = await db.collection(prefix + c).get();
    D[c] = {}; snap.forEach(d => { D[c][d.id] = d.data(); });
  }
  D.config = D.config.main || {};
  return D;
}
/* アプリの hydrate と同じ: 行ごとの確認・戻し(st)を rows に重ねる */
function hydrate(cf) {
  const st = cf.st || {};
  (cf.rows || []).forEach(r => { const x = st[r.vid + "|" + r.floor + "|" + (r.ev || 0)]; if (!x) return;
    ["chk", "back"].forEach(f => { if (f in x) { if (x[f]) r[f] = x[f]; else delete r[f]; } }); });
  return cf;
}
const vname = (D, id) => (D.approved[id] && D.approved[id].company) || (D.vendors[id] && D.vendors[id].name) || (D.members[id] && D.members[id].company) || "名称未設定";

for (const app of APPS) {
  const D = await load(app.prefix);
  backup[app.prefix || "nr"] = JSON.parse(JSON.stringify(D, (k, v) => (v && v.toDate ? v.toDate().toISOString() : v)));
  Object.values(D.confirmed).forEach(hydrate);
  const cfg = nrCfg(D.config);
  const am = {}; Object.keys(D.vendors).forEach(id => { const v = D.vendors[id]; if (D.approved[id] || v.manual || v.sample) am[id] = v; });
  const sim = nrSimulate(am, D.days, cfg, today, D.confirmed);

  /* 1. 自動確定(アプリの autoConfirm と同じ条件) */
  const done = [];
  if (cfg.auto > 0) {
    for (const d of Object.keys(D.days).sort()) {
      const day = D.days[d], s = sim.byDate[d];
      const until = Math.round((nrPd(d) - nrPd(today)) / 864e5);
      if (D.confirmed[d] || day.hold || !nrNum(day.cap) || !(day.elev || []).length || d < today || until > cfg.auto || !s || !s.asg.length) continue;
      if (day.edited && Date.now() - Date.parse(day.edited) < 10 * 60 * 1000) continue;
      const rows = s.asg.map(a => ({ vid: a.vid, floor: a.floor, units: a.units, ev: a.ev || null, to: a.to || null, ret: a.ret || null, n: vname(D, a.vid) }));
      const at = new Date().toISOString();
      await db.collection(app.prefix + "confirmed").doc(d).set({ rows, at, by: "毎朝の自動処理", auto: true, hist: [{ at, by: "毎朝の自動処理", t: "自動で確定" }] });
      D.confirmed[d] = { rows };
      const seen = {};
      for (const r of rows) {
        if (seen[r.vid] || (D.vendors[r.vid] && D.vendors[r.vid].manual)) continue; seen[r.vid] = 1;
        const msg = fmtD(d) + " " + fmtTime(day) + " の予定が確定しました: " + rows.filter(x => x.vid === r.vid).map(x => x.floor + "階 " + x.units + "台 → " + evLabel(x.ev, x.to)).join("、");
        const id = "n" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
        await db.collection(app.prefix + "notices").doc(r.vid).set({ items: { [id]: { d, kind: "confirm", msg, at, by: "毎朝の自動処理" } } }, { merge: true });
      }
      done.push(d);
    }
  }
  if (done.length) console.log(app.name + ": 自動で確定 " + done.join(", "));

  /* 2. LINE の文面 */
  const tm = nrDs(new Date(nrPd(today).getTime() + 864e5));
  for (const [d, label] of [[today, "本日"], [tm, "明日"]]) {
    const cf = D.confirmed[d]; if (!cf || !(cf.rows || []).length) continue;
    const day = D.days[d] || {};
    lines.push("【" + app.name + "】" + label + " " + fmtD(d) + " " + fmtTime(day));
    cf.rows.filter(r => nrNum(r.units) > 0).forEach(r => lines.push("・" + (r.n || vname(D, r.vid)) + " " + r.floor + "階 " + nrNum(r.units) + "台 → " + evLabel(r.ev, r.to) + (label === "明日" && r.to ? "(今日中に移動)" : "")));
  }
  let newOrders = 0; Object.values(D.orders).forEach(o => Object.values(o.items || {}).forEach(x => { if (x.st === "new") newOrders++; }));
  if (newOrders) lines.push("【" + app.name + "】新しい追加注文 " + newOrders + "件(アプリの「追加注文」で手配してください)");
}

/* LINE に送る。LINE_TO(グループ・ユーザーのID)があればそこへ、なければ公式アカウントの友だち全員へ */
const token = process.env.LINE_CHANNEL_TOKEN;
if (token && lines.length) {
  const text = lines.join("\n").slice(0, 4900) + "\n\nアプリ: https://030809240222im-star.github.io/nr-rack/";
  const to = process.env.LINE_TO;
  const res = await fetch("https://api.line.me/v2/bot/message/" + (to ? "push" : "broadcast"), {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(to ? { to, messages: [{ type: "text", text }] } : { messages: [{ type: "text", text }] })
  });
  console.log("LINE:", res.status, res.ok ? "送信しました" : await res.text());
} else console.log(token ? "LINE: 今日送る予定はありません" : "LINE: 設定がないので送りません");

/* 3. 暗号化バックアップ(AES-256-GCM)。戻すときは server/decrypt-backup.mjs */
const pass = process.env.BACKUP_PASSWORD;
if (pass) {
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), key = crypto.scryptSync(pass, salt, 32);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(JSON.stringify({ at: new Date().toISOString(), data: backup })), c.final()]);
  fs.mkdirSync(root + "backup-out", { recursive: true });
  fs.writeFileSync(root + "backup-out/backup-" + today + ".enc", Buffer.concat([salt, iv, c.getAuthTag(), enc]));
  console.log("バックアップを作りました: backup-" + today + ".enc");
}
