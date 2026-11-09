/* 業者へのメール(GitHub Actions から動かす)
   MAIL_MODE=pre   : 搬出日の前日 13:00 … 明日の搬出予定(前日メール)と、搬出日から3日たってもアプリを開いていない業者への確認メール
   MAIL_MODE=day   : 搬出日の当日 6:30 … 今日の搬出予定(当日メール)
   送り先は、その会社で利用中の人(approved)のメールアドレス全員。管理者が追加した業者(アプリを使わない業者)には送らない。
   同じメールを二度送らないよう、送った記録を maillog/{日付} に残す(アプリからは読まない)。
   MAIL_FIXTURE=データのJSON を渡すと、Firebase とメールを使わずに文面だけ表示する(試験用)。 */
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname;
const html = fs.readFileSync(root + "index.html", "utf8");
const core = html.match(/<script>\s*([\s\S]*?function nrRank[\s\S]*?)<\/script>/)[1];
const ctx = {}; vm.createContext(ctx); vm.runInContext(core, ctx);
const { nrDs, nrPd, nrNum } = ctx;

const MODE = process.env.MAIL_MODE || "pre";
const APP_URL = "https://030809240222im-star.github.io/nr-rack/";
const APPS = [{ prefix: "", name: "NRボックス", item: "NRボックス", url: APP_URL }, { prefix: "scrap_", name: "スクラップ搬出", item: "スクラップ台車", url: APP_URL + "scrap/" }];
const COLLS = ["days", "vendors", "approved", "members", "confirmed", "seen", "maillog"];
const WD = ["日", "月", "火", "水", "木", "金", "土"];
const fmtD = s => { const d = nrPd(s); return (d.getMonth() + 1) + "月" + d.getDate() + "日(" + WD[d.getDay()] + ")"; };
const fmtTime = d => d && d.tf ? d.tf + "〜" + (d.tt || "") : "時間未定";
const evLabel = (e, to) => e ? (to ? to + "階のEV" + e + "前" : "EV" + e + "前") : "未定";
const SEEN_SINCE = process.env.SEEN_SINCE || "2026-11-10";
const addDays = (s, n) => nrDs(new Date(nrPd(s).getTime() + n * 864e5));

/* 決まった時刻(GitHub は少し早めに起こす)まで待つ。遅れて起きたときはすぐ送る */
const target = { pre: [13, 0], day: [6, 30] }[MODE];
if (!process.env.MAIL_FIXTURE && target && process.env.WAIT_UNTIL_TIME !== "0") {
  const now = new Date(), t = new Date(now); t.setHours(target[0], target[1], 0, 0);
  const wait = t - now; if (wait > 0 && wait < 40 * 60 * 1000) { console.log(Math.round(wait / 1000) + "秒待ってから送ります"); await new Promise(r => setTimeout(r, wait)); }
}
const today = nrDs(new Date());

/* データの読み込み */
let db = null, FieldValue = null;
const fixture = process.env.MAIL_FIXTURE ? JSON.parse(fs.readFileSync(process.env.MAIL_FIXTURE, "utf8")) : null;
if (!fixture) {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "null");
  if (!sa) { console.log("FIREBASE_SERVICE_ACCOUNT がないので終了します"); process.exit(0); }
  const admin = (await import("firebase-admin")).default;
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  const fsx = await import("firebase-admin/firestore");
  db = fsx.getFirestore(admin.app(), process.env.FIRESTORE_DB || "default"); FieldValue = fsx.FieldValue;
}
async function load(prefix) {
  if (fixture) { const D = {}; COLLS.forEach(c => { D[c] = (fixture[prefix || "nr"] || {})[c] || {}; }); return D; }
  const D = {};
  for (const c of COLLS) { const snap = await db.collection(prefix + c).get(); D[c] = {}; snap.forEach(d => { D[c][d.id] = d.data(); }); }
  return D;
}

/* メールの送り方: Gmail などの SMTP(MAIL_USER と MAIL_PASS)。設定がなければ文面をログに出すだけ */
let transport = null;
if (!fixture && process.env.MAIL_USER && process.env.MAIL_PASS) {
  const nodemailer = (await import("nodemailer")).default;
  transport = nodemailer.createTransport({ host: process.env.MAIL_HOST || "smtp.gmail.com", port: Number(process.env.MAIL_PORT || 465), secure: true, auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } });
}
const FROM = (process.env.MAIL_FROM_NAME || "NRボックス・スクラップ搬出 調整") + " <" + (process.env.MAIL_USER || "noreply@example.com") + ">";
let sent = 0, failed = 0;
async function send(to, subject, text) {
  if (!to.length) return false;
  /* 公開リポジトリのログは誰でも見られるので、本番では宛先のアドレスを出さない */
  if (!transport) { console.log("----\n" + (fixture ? "宛先: " + to.join(", ") : "宛先: " + to.length + "人") + "\n件名: " + subject + (fixture ? "\n" + text : "")); return !!fixture; }
  try { await transport.sendMail({ from: FROM, bcc: to, subject, text }); sent++; return true; }
  catch (e) { failed++; console.log("送れませんでした(" + subject + "): " + (e && e.message)); return false; }
}

const vidOf = (D, u) => (D.approved[u] && D.approved[u].vid) || u;
const membersOf = (D, vid) => Object.keys(D.approved).filter(u => vidOf(D, u) === vid);
const emailsOf = (D, vid) => [...new Set(membersOf(D, vid).map(u => (D.approved[u].email || (D.members[u] || {}).email || "").trim()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))];
const vname = (D, vid) => { const m = membersOf(D, vid)[0]; return (m && D.approved[m].company) || (D.vendors[vid] && D.vendors[vid].name) || "業者"; };
const footer = app => "\n\n予定の確認や連絡は、アプリから行ってください。\n" + app.url + "\n\n※このメールは送信専用です。お問い合わせは管理者へ直接ご連絡ください。";

function rowsText(rows, label) {
  return rows.map(r => "・" + r.floor + "階 " + nrNum(r.units) + "台 → " + evLabel(r.ev, r.to)
    + (r.to && label === "明日" ? "(今日中に" + r.to + "階へ移動してください)" : "")
    + (r.ret && Number(r.ret) !== Number(r.floor) ? "(戻し先: " + r.ret + "階)" : "")).join("\n");
}
async function mark(app, d, key) {
  if (fixture) return;
  await db.collection(app.prefix + "maillog").doc(d).set({ [key]: new Date().toISOString() }, { merge: true });
}

for (const app of APPS) {
  const D = await load(app.prefix);
  const log = D.maillog || {};
  /* 前日メール・当日メール */
  const d = MODE === "pre" ? addDays(today, 1) : today, label = MODE === "pre" ? "明日" : "本日", kind = MODE === "pre" ? "pre" : "day";
  const cf = D.confirmed[d], day = D.days[d] || {};
  if (cf && (cf.rows || []).length) {
    const byV = {}; cf.rows.filter(r => nrNum(r.units) > 0).forEach(r => { (byV[r.vid] = byV[r.vid] || []).push(r); });
    for (const vid of Object.keys(byV)) {
      const key = kind + "_" + vid;
      if ((log[d] || {})[key] || (D.vendors[vid] && D.vendors[vid].manual)) continue;
      const to = emailsOf(D, vid);
      const subject = "【" + app.name + "】" + label + " " + fmtD(d) + " の搬出予定";
      const text = vname(D, vid) + " 御中\n\n" + label + "(" + fmtD(d) + " " + fmtTime(day) + ")の搬出予定です。\n\n" + rowsText(byV[vid], label)
        + (MODE === "pre" ? "\n\n前日のうちに、指定のエレベーター前への" + app.item + "の準備をお願いします。" : "\n\n本日はよろしくお願いします。")
        + footer(app);
      if (await send(to, subject, text)) await mark(app, d, key);
    }
  }
  /* 搬出日から3日たってもアプリを開いていない業者への確認メール(前日メールと同じ 13:00 に送る。7日を過ぎたら送らない) */
  if (MODE === "pre") {
    for (const cd of Object.keys(D.confirmed).sort()) {
      /* 最終ログインの記録を始めた日より前の搬出日は、開いたかどうか分からないので送らない */
      if (!(cd <= addDays(today, -3) && cd >= addDays(today, -7)) || cd < SEEN_SINCE) continue;
      const rows = (D.confirmed[cd].rows || []).filter(r => nrNum(r.units) > 0), vids = [...new Set(rows.map(r => r.vid))];
      const since = nrPd(cd).getTime();
      for (const vid of vids) {
        const key = "chk_" + vid;
        if ((log[cd] || {})[key] || (D.vendors[vid] && D.vendors[vid].manual)) continue;
        const opened = membersOf(D, vid).some(u => { const s = D.seen[u]; return s && s.at && Date.parse(s.at) >= since; });
        if (opened) continue;
        const to = emailsOf(D, vid);
        const subject = "【" + app.name + "】" + fmtD(cd) + " の搬出結果のご確認のお願い";
        const text = vname(D, vid) + " 御中\n\n" + fmtD(cd) + "の搬出のあと、アプリがまだ開かれていないようです。\n"
          + "戻ってきた台数や、各階の保有台数に違いがないか、アプリの「業者入力」でご確認ください。違いがあれば、その場で直していただけます。\n\n"
          + "この日の搬出:\n" + rowsText(rows.filter(r => r.vid === vid), "")
          + footer(app);
        if (await send(to, subject, text)) await mark(app, cd, key);
      }
    }
  }
}
console.log(transport ? "メール: " + sent + "通送りました" + (failed ? "(" + failed + "通は送れませんでした)" : "") : fixture ? "(試験: 文面だけ表示しました)" : "メール: MAIL_USER と MAIL_PASS がないので送りません(文面はこのログのとおり)");
