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
const { nrCfg, nrSimulate, nrDs, nrPd, nrNum, nrRemind, nrBase, nrConfirmDay, nrPreDays } = ctx;

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "null");
if (!sa) { console.log("FIREBASE_SERVICE_ACCOUNT がないので終了します"); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
const db = getFirestore(admin.app(), process.env.FIRESTORE_DB || "default");

const APPS = [{ prefix: "", name: "NRボックス" }, { prefix: "scrap_", name: "スクラップ" }];
const COLLS = ["config", "days", "vendors", "approved", "blocked", "confirmed", "members", "plans", "orders", "notices", "crews", "crewreq", "crewblocked", "codes"];
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const fmtD = s => { const d = nrPd(s); return (d.getMonth() + 1) + "/" + d.getDate() + "(" + WD[d.getDay()] + ")"; };
/* 1日に複数回(午前・午後など)あるときのキーは「日付」「日付-2」…。同じ日の回の一覧と名前 */
const sesNo = k => { const m = /^\d{4}-\d{2}-\d{2}-(\d+)$/.exec(k); return m ? Number(m[1]) : 1; };
const sesKeysOf = (D, date) => [...new Set([...Object.keys(D.days), ...Object.keys(D.confirmed)])].filter(k => k.slice(0, 10) === date).sort((a, b) => sesNo(a) - sesNo(b));
const sesLab = (D, k) => { const ks = sesKeysOf(D, k.slice(0, 10)); return ks.length < 2 ? "" : " " + ((D.days[k] && D.days[k].lb) || sesNo(k) + "回目"); };
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
/* 業者は会社(vid)単位。approved/{人}.vid が会社ID(無ければ本人のID) */
const vidOf = (D, u) => (D.approved[u] && D.approved[u].vid) || u;
const vname = (D, id) => { const ms = Object.keys(D.approved).filter(u => vidOf(D, u) === id); const m = ms.indexOf(id) >= 0 ? id : ms[0]; return (m && D.approved[m].company) || (D.vendors[id] && D.vendors[id].name) || (D.members[id] && D.members[id].company) || "名称未設定"; };

for (const app of APPS) {
  const D = await load(app.prefix);
  backup[app.prefix || "nr"] = JSON.parse(JSON.stringify(D, (k, v) => (v && v.toDate ? v.toDate().toISOString() : v)));
  Object.values(D.confirmed).forEach(hydrate);
  const cfg = nrCfg(D.config);
  const active = {}; Object.keys(D.approved).forEach(u => { active[vidOf(D, u)] = 1; });
  const am = {}; Object.keys(D.vendors).forEach(id => { const v = D.vendors[id]; if (active[id] || v.manual || v.sample) am[id] = v; });
  const sim = nrSimulate(am, D.days, cfg, today, D.confirmed);

  /* 1. 自動確定(アプリの autoConfirm と同じ条件) */
  const done = [];
  if (cfg.auto > 0) {
    for (const d of Object.keys(D.days).sort()) {
      const day = D.days[d], s = sim.byDate[d];
      /* 確定日は、回収日の cfg.auto 営業日前(土日祝を除く) */
      if (D.confirmed[d] || day.hold || !nrNum(day.cap) || !(day.elev || []).length || nrBase(d) < today || today < nrConfirmDay(d, cfg) || !s || !s.asg.length) continue;
      if (day.edited && Date.now() - Date.parse(day.edited) < 10 * 60 * 1000) continue;
      const rows = s.asg.map(a => { const o = { vid: a.vid, floor: a.floor, units: a.units, ev: a.ev || null, to: a.to || null, ret: a.ret || null, n: vname(D, a.vid) }; if (a.rets) o.rets = JSON.parse(JSON.stringify(a.rets)); return o; });
      const at = new Date().toISOString();
      await db.collection(app.prefix + "confirmed").doc(d).set({ rows, at, by: "毎朝の自動処理", auto: true, hist: [{ at, by: "毎朝の自動処理", t: "自動で確定" }] });
      D.confirmed[d] = { rows };
      const seen = {};
      for (const r of rows) {
        if (seen[r.vid] || (D.vendors[r.vid] && D.vendors[r.vid].manual)) continue; seen[r.vid] = 1;
        const msg = fmtD(d) + sesLab(D, d) + " " + fmtTime(day) + " の予定が確定しました: " + rows.filter(x => x.vid === r.vid).map(x => x.floor + "階 " + x.units + "台(" + evLabel(x.ev, x.to) + ")").join("、");
        const id = "n" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
        await db.collection(app.prefix + "notices").doc(r.vid).set({ items: { [id]: { d, kind: "confirm", msg, at, by: "毎朝の自動処理" } } }, { merge: true });
        /* プッシュ通知・メールの送信待ち(アプリで確定したときと同じ) */
        await db.collection(app.prefix + "outbox").doc("n-" + r.vid + "-" + id).set({ to: "vendor", vid: r.vid, d, msg, at, uid: "server" });
      }
      /* 盛替え業者へ: その日の予定の全部 */
      const crewMsg = fmtD(d) + sesLab(D, d) + " " + fmtTime(day) + " の搬出予定が確定しました。\n" + rows.filter(x => nrNum(x.units) > 0).map(x => "・" + (x.n || vname(D, x.vid)) + " " + x.floor + "階 " + x.units + "台(" + evLabel(x.ev, x.to) + ")").join("\n");
      await db.collection(app.prefix + "outbox").doc("c-" + d).set({ to: "crew", d, msg: crewMsg.slice(0, 600), at, uid: "server" });
      done.push(d);
    }
  }
  if (done.length) console.log(app.name + ": 自動で確定 " + done.join(", "));

  /* 1-2. 搬出予定の入力のお願い(確定の2日前)と警告(確定の前日)。アプリと同じ id で、二重には出さない。メールは送信待ち(outbox)へ */
  const rem = nrRemind(am, D.days, D.confirmed, cfg, today);
  for (const x of rem) {
    const id = "r" + x.lv + "_" + x.d, it = (D.notices[x.vid] || {}).items || {};
    if (it[id]) continue;
    const at = new Date().toISOString();
    await db.collection(app.prefix + "notices").doc(x.vid).set({ items: { [id]: { d: x.d, kind: x.lv === 1 ? "remind" : "remind2", msg: x.msg, at, by: "毎朝の自動処理" } } }, { merge: true });
    await db.collection(app.prefix + "outbox").doc("rm" + x.lv + "-" + x.vid + "-" + x.d).set({ to: "vendor", vid: x.vid, d: x.d, msg: x.msg, at, uid: "server" });
  }
  if (rem.length) console.log(app.name + ": 入力のお願い・警告 " + rem.length + "件");

  /* 2. LINE の文面 */
  /* 本日と、次の営業日まで(金曜なら土・日・月)の予定。土日祝は前の営業日に知らせ済みなので、本日の分だけ */
  const tm = nrDs(new Date(nrPd(today).getTime() + 864e5));
  for (const [d, label] of [[today, "本日"], ...nrPreDays(today, cfg).map(b => [b, b === tm ? "明日" : "次の搬出"])].flatMap(([b, l]) => sesKeysOf(D, b).map(k => [k, l]))) {
    const cf = D.confirmed[d]; if (!cf || !(cf.rows || []).length) continue;
    const day = D.days[d] || {};
    lines.push("【" + app.name + "】" + label + " " + fmtD(d) + sesLab(D, d) + " " + fmtTime(day));
    cf.rows.filter(r => nrNum(r.units) > 0).forEach(r => {
      lines.push("・" + (r.n || vname(D, r.vid)) + " " + r.floor + "階 " + nrNum(r.units) + "台 → " + evLabel(r.ev, r.to) + (label !== "本日" && r.to ? "(今日中に移動)" : ""));
      /* 管理者が指定したEV以外に業者が置いていたら知らせる */
      const pl = D.vendors[r.vid] && D.vendors[r.vid].placed && D.vendors[r.vid].placed[d + "|" + r.floor], pe = pl && typeof pl === "object" ? nrNum(pl.ev) : 0;
      const dg = [...new Set([...(day.elev || []), ...Object.values(day.moves || {}).map(m => nrNum(m.ev))])].filter(Boolean).sort((p, q) => p - q);
      if (pe && (day.elev || []).length && dg.indexOf(pe) < 0 && !r.back) lines.push("  ⚠ EV" + pe + "に置かれています(指定: " + dg.map(e => "EV" + e).join("・") + ")");
    });
  }
  /* 盛替え業者への指示(管理者が出した「前日までに○階へ盛替え」。2日先までの回収日分) */
  const mvLines = [];
  for (const k of Object.keys(D.days).sort()) {
    const b = nrBase(k); if (b < today || b > nrDs(new Date(nrPd(today).getTime() + 2 * 864e5))) continue;
    Object.entries(D.days[k].moves || {}).forEach(([key, m]) => { const q = key.split("|"); mvLines.push("・" + fmtD(k) + sesLab(D, k) + "の回収: " + vname(D, q[0]) + " " + q[1] + "階" + (nrNum(m.u) ? " " + nrNum(m.u) + "台" : "") + " → " + (m.md ? fmtD(m.md) + "に" : "前日までに") + evLabel(nrNum(m.ev), nrNum(m.to)) + "へ盛替え"); });
  }
  if (mvLines.length) lines.push("【" + app.name + "】盛替えの指示", ...mvLines);
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
