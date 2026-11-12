/* メールのお知らせ(GitHub Actions から10分ごとに動かす)
   アプリが outbox/{id}(スクラップ版は scrap_outbox)に入れた送信待ちを読み、宛先ごとに1通にまとめてメールで送り、送った分を消す。
   - to: "vendor" … その会社で利用中の人(approved)のメールアドレス全員。管理者が追加した業者(manual)には送らない
   - to: "crew"   … 利用中の盛替え業者(crews)全員
   - to: "admin"  … 設定(config/main.mailAdmins)でチェックした管理者
   読むのは送信待ちだけ(空なら1回の読み取りで終わる)。送るものがあるときだけ、宛先を調べるために approved・crews などを読む。
   業者・盛替え業者あての送信待ちは、入れた人が管理者(業者あては盛替え業者も可)のときだけ送る(ルールでも制限している)。
   1日以上前の送信待ちは、送らずに消す(設定前にたまった分をまとめて送らないため)。 */
import fs from "node:fs";
import admin from "firebase-admin";

const root = new URL("..", import.meta.url).pathname;
const html = fs.readFileSync(root + "index.html", "utf8");
const ADMINS = JSON.parse((html.match(/adminEmails:(\[[^\]]*\])/) || [])[1] || "[]").map(e => e.toLowerCase());

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "null");
if (!sa) { console.log("FIREBASE_SERVICE_ACCOUNT がないので終了します"); process.exit(0); }
if (!process.env.MAIL_USER || !process.env.MAIL_PASS) { console.log("MAIL_USER と MAIL_PASS がないので終了します"); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const { getFirestore } = await import("firebase-admin/firestore");
const db = getFirestore(admin.app(), process.env.FIRESTORE_DB || "default");
const nodemailer = (await import("nodemailer")).default;
const transport = nodemailer.createTransport({ host: process.env.MAIL_HOST || "smtp.gmail.com", port: Number(process.env.MAIL_PORT || 465), secure: true, auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } });
const FROM = (process.env.MAIL_FROM_NAME || "NRボックス・スクラップ搬出 調整") + " <" + process.env.MAIL_USER + ">";

const APP_URL = "https://030809240222im-star.github.io/nr-rack/";
const APPS = [{ prefix: "", name: "NRボックス", url: APP_URL, crewUrl: APP_URL + "crew/" }, { prefix: "scrap_", name: "スクラップ搬出", url: APP_URL + "scrap/", crewUrl: APP_URL + "scrap/crew/" }];
const okMail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || "");
const emailOfUid = {};
async function userEmail(uid) {
  if (uid in emailOfUid) return emailOfUid[uid];
  try { const u = await admin.auth().getUser(uid); emailOfUid[uid] = u.emailVerified ? String(u.email || "").toLowerCase() : ""; } catch (e) { emailOfUid[uid] = ""; }
  return emailOfUid[uid];
}
async function load(P, c) { const m = {}; (await db.collection(P + c).get()).forEach(d => { m[d.id] = d.data(); }); return m; }

let sent = 0, failed = 0, dropped = 0;
const dayAgo = new Date(Date.now() - 864e5).toISOString();
for (const app of APPS) {
  const P = app.prefix;
  const snap = await db.collection(P + "outbox").get();
  if (snap.empty) continue;
  const items = []; snap.forEach(d => items.push({ id: d.id, ref: d.ref, ...d.data() }));
  const [approved, crews, vendors, members] = await Promise.all(["approved", "crews", "vendors", "members"].map(c => load(P, c)));
  const config = (await db.doc(P + "config/main").get()).data() || {};
  const vidOf = u => (approved[u] && approved[u].vid) || u;
  const vname = vid => { const m = Object.keys(approved).find(u => vidOf(u) === vid); return (m && approved[m].company) || (vendors[vid] && vendors[vid].name) || "業者"; };
  const vendorMails = vid => [...new Set(Object.keys(approved).filter(u => vidOf(u) === vid).map(u => String(approved[u].email || (members[u] || {}).email || "").trim()).filter(okMail))];

  /* 宛先ごとにまとめる */
  const groups = {}; const done = [];
  for (const x of items) {
    done.push(x.ref);
    if (!x.at || x.at < dayAgo || !x.msg) { dropped++; continue; }
    const who = x.uid === "server" ? "" : await userEmail(x.uid), byAdmin = x.uid === "server" || ADMINS.includes(who), byCrew = !!crews[x.uid];
    let key = null, to = [], title = "", url = app.url;
    if (x.to === "vendor" && x.vid && (byAdmin || byCrew)) {
      if (vendors[x.vid] && vendors[x.vid].manual) continue;
      key = "v:" + x.vid; to = vendorMails(x.vid); title = vname(x.vid) + " 御中";
    } else if (x.to === "crew" && byAdmin) {
      key = "c"; to = [...new Set(Object.values(crews).map(c => String(c.email || "").trim()).filter(okMail))]; title = "盛替え業者の皆さま"; url = app.crewUrl;
    } else if (x.to === "admin") {
      key = "a"; to = (config.mailAdmins || []).map(e => String(e).toLowerCase()).filter(e => ADMINS.includes(e)); title = "管理者の皆さま";
    }
    if (!key || !to.length) { dropped++; continue; }
    const g = groups[key] = groups[key] || { to, title, url, msgs: [] };
    g.msgs.push({ at: x.at, msg: x.msg });
  }
  for (const k of Object.keys(groups)) {
    const g = groups[k], msgs = g.msgs.sort((a, b) => a.at < b.at ? -1 : 1).map(m => m.msg);
    const subject = "【" + app.name + "】お知らせ" + (msgs.length > 1 ? " " + msgs.length + "件" : "") + ": " + msgs[0].split("\n")[0].slice(0, 40);
    const text = g.title + "\n\n" + msgs.map(m => "■ " + m).join("\n\n")
      + "\n\n詳しくはアプリでご確認ください。\n" + g.url + "\n\n※このメールは送信専用です。お問い合わせは管理者へ直接ご連絡ください。";
    try { await transport.sendMail({ from: FROM, bcc: g.to, subject, text }); sent++; }
    catch (e) { failed++; console.log("送れませんでした(" + k + "): " + (e && e.message)); continue; }
  }
  /* 送れなかった宛先の分も消す(次の回に同じものを何度も送らないため。アプリのお知らせには残っている) */
  for (const r of done) await r.delete();
}
console.log("メールのお知らせ: " + sent + "通送りました" + (failed ? "・" + failed + "通は送れませんでした" : "") + (dropped ? "・送らずに消した送信待ち " + dropped + "件" : ""));
