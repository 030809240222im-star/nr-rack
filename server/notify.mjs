/* お知らせの送信(GitHub Actions から10分ごとに動かす): プッシュ通知とメール
   アプリが outbox/{id}(スクラップ版は scrap_outbox)に入れた送信待ちを読み、宛先ごとに1つにまとめて送り、送った分を消す。
   - to: "vendor" … その会社で利用中の人(approved)。管理者が追加した業者(manual)には送らない
   - to: "crew"   … 利用中の盛替え業者(crews)
   - to: "admin"  … プッシュ通知は通知を許可した管理者全員、メールは設定(config/main.mailAdmins)でチェックした管理者
   - to: "me"     … 入れた本人だけ(プッシュ通知の「設定ができました」)
   プッシュ通知: 送る先は push/{利用者}.subs(本人が「通知を受け取る」で登録した端末)。届かなくなった端末は消す。
     通知の鍵(VAPID)は最初の実行で作って pushkeys/main(アプリからは読めない)に保存し、公開鍵だけを config/main.vapid に書く。
   メール: MAIL_USER と MAIL_PASS があるときだけ送る。
   読むのは送信待ちだけ(空なら少しの読み取りで終わる)。送るものがあるときだけ、宛先を調べるために approved・crews・push などを読む。
   業者・盛替え業者あての送信待ちは、入れた人が管理者・利用中の業者(業者あては盛替え業者も)のときだけ送る(ルールでも制限している)。
   1日以上前の送信待ちは、送らずに消す(設定前にたまった分をまとめて送らないため)。 */
import fs from "node:fs";
import admin from "firebase-admin";
import webpush from "web-push";

const root = new URL("..", import.meta.url).pathname;
const html = fs.readFileSync(root + "index.html", "utf8");
const ADMINS = JSON.parse((html.match(/adminEmails:(\[[^\]]*\])/) || [])[1] || "[]").map(e => e.toLowerCase());

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "null");
if (!sa) { console.log("FIREBASE_SERVICE_ACCOUNT がないので終了します"); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
const db = getFirestore(admin.app(), process.env.FIRESTORE_DB || "default");

let transport = null, FROM = "";
if (process.env.MAIL_USER && process.env.MAIL_PASS) {
  const nodemailer = (await import("nodemailer")).default;
  transport = nodemailer.createTransport({ host: process.env.MAIL_HOST || "smtp.gmail.com", port: Number(process.env.MAIL_PORT || 465), secure: true, auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } });
  FROM = (process.env.MAIL_FROM_NAME || "NRボックス・スクラップ搬出 調整") + " <" + process.env.MAIL_USER + ">";
}

const APP_URL = "https://030809240222im-star.github.io/nr-rack/";
const APPS = [{ prefix: "", name: "NRボックス", url: APP_URL, crewUrl: APP_URL + "crew/" }, { prefix: "scrap_", name: "スクラップ搬出", url: APP_URL + "scrap/", crewUrl: APP_URL + "scrap/crew/" }];

/* 通知の鍵: なければ作る。公開鍵は両方のアプリの設定に書く(同じ端末の登録を2つのアプリで共有するため、鍵は1組) */
const keyRef = db.doc("pushkeys/main");
let keys = (await keyRef.get()).data();
if (!keys || !keys.pub || !keys.priv) { const k = webpush.generateVAPIDKeys(); keys = { pub: k.publicKey, priv: k.privateKey, at: new Date().toISOString() }; await keyRef.set(keys); console.log("通知の鍵を作りました"); }
webpush.setVapidDetails("mailto:noreply@example.com", keys.pub, keys.priv);
for (const app of APPS) {
  const c = (await db.doc(app.prefix + "config/main").get()).data() || {};
  if (c.vapid !== keys.pub) await db.doc(app.prefix + "config/main").set({ vapid: keys.pub }, { merge: true });
}

const okMail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || "");
const emailOfUid = {};
async function userEmail(uid) {
  if (uid in emailOfUid) return emailOfUid[uid];
  try { const u = await admin.auth().getUser(uid); emailOfUid[uid] = u.emailVerified ? String(u.email || "").toLowerCase() : ""; } catch (e) { emailOfUid[uid] = ""; }
  return emailOfUid[uid];
}
async function load(P, c) { const m = {}; (await db.collection(P + c).get()).forEach(d => { m[d.id] = d.data(); }); return m; }

let mails = 0, pushes = 0, failed = 0, dropped = 0, gone = 0;
const dayAgo = new Date(Date.now() - 864e5).toISOString();
for (const app of APPS) {
  const P = app.prefix;
  const snap = await db.collection(P + "outbox").get();
  /* 確認用: 通知を許可した端末の数と、送信待ちの数をログに出す */
  const pc = await db.collection(P + "push").get(); let devs = 0; pc.forEach(d => { devs += Object.keys((d.data() || {}).subs || {}).length; });
  console.log(app.name + ": 通知を許可した端末 " + devs + "台(" + pc.size + "人)・送信待ち " + snap.size + "件");
  if (snap.empty) continue;
  const items = []; snap.forEach(d => items.push({ id: d.id, ref: d.ref, ...d.data() }));
  const [approved, crews, vendors, members, push] = await Promise.all(["approved", "crews", "vendors", "members", "push"].map(c => load(P, c)));
  const config = (await db.doc(P + "config/main").get()).data() || {};
  const vidOf = u => (approved[u] && approved[u].vid) || u;
  const vname = vid => { const m = Object.keys(approved).find(u => vidOf(u) === vid); return (m && approved[m].company) || (vendors[vid] && vendors[vid].name) || "業者"; };
  const vendorUids = vid => Object.keys(approved).filter(u => vidOf(u) === vid);
  const vendorMails = vid => [...new Set(vendorUids(vid).map(u => String(approved[u].email || (members[u] || {}).email || "").trim()).filter(okMail))];
  const adminPushUids = [];
  for (const u of Object.keys(push)) if (push[u].kind === "admin" && ADMINS.includes(await userEmail(u))) adminPushUids.push(u);

  /* 宛先ごとにまとめる */
  const groups = {}; const done = [];
  for (const x of items) {
    done.push(x.ref);
    if (!x.at || x.at < dayAgo || !x.msg) { dropped++; continue; }
    const who = x.uid === "server" ? "" : await userEmail(x.uid), byAdmin = x.uid === "server" || ADMINS.includes(who), byCrew = !!crews[x.uid], byVendor = !!approved[x.uid];
    let key = null, to = [], uids = [], title = "", url = app.url;
    if (x.to === "vendor" && x.vid && (byAdmin || byCrew || byVendor)) {
      if (vendors[x.vid] && vendors[x.vid].manual) continue;
      key = "v:" + x.vid; to = vendorMails(x.vid); uids = vendorUids(x.vid); title = vname(x.vid) + " 御中";
    } else if (x.to === "crew" && (byAdmin || byVendor)) {
      key = "c"; to = [...new Set(Object.values(crews).map(c => String(c.email || "").trim()).filter(okMail))]; uids = Object.keys(crews); title = "盛替え業者の皆さま"; url = app.crewUrl;
    } else if (x.to === "admin") {
      key = "a"; to = (config.mailAdmins || []).map(e => String(e).toLowerCase()).filter(e => ADMINS.includes(e)); uids = adminPushUids; title = "管理者の皆さま";
    } else if (x.to === "me" && x.uid && x.uid !== "server") {
      key = "me:" + x.uid; uids = [x.uid]; url = crews[x.uid] ? app.crewUrl : app.url;
    }
    if (!key || (!to.length && !uids.length)) { dropped++; continue; }
    const g = groups[key] = groups[key] || { to, uids, title, url, msgs: [], me: x.to === "me" };
    g.msgs.push({ at: x.at, msg: x.msg });
  }
  for (const k of Object.keys(groups)) {
    const g = groups[k], msgs = g.msgs.sort((a, b) => a.at < b.at ? -1 : 1).map(m => m.msg);
    /* プッシュ通知 */
    const ptitle = "【" + app.name + "】" + (g.me ? "通知の設定" : msgs.length > 1 ? "お知らせ " + msgs.length + "件" : "お知らせ");
    const pbody = msgs.slice(0, 4).join("\n").slice(0, 300) + (msgs.length > 4 ? "\nほか" + (msgs.length - 4) + "件" : "");
    for (const u of g.uids) {
      const subs = (push[u] || {}).subs || {};
      for (const h of Object.keys(subs)) {
        const sub = subs[h]; if (!sub || !sub.endpoint) continue;
        try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify({ title: ptitle, body: pbody, url: g.url, tag: P + k }), { TTL: 12 * 3600 }); pushes++; }
        catch (e) {
          if (e && (e.statusCode === 404 || e.statusCode === 410)) { gone++; await db.doc(P + "push/" + u).update({ ["subs." + h]: FieldValue.delete() }); }
          else { failed++; console.log("通知を送れませんでした: " + (e && (e.statusCode || e.message))); }
        }
      }
    }
    /* メール */
    if (transport && g.to.length && !g.me) {
      const subject = "【" + app.name + "】お知らせ" + (msgs.length > 1 ? " " + msgs.length + "件" : "") + ": " + msgs[0].split("\n")[0].slice(0, 40);
      const text = g.title + "\n\n" + msgs.map(m => "■ " + m).join("\n\n")
        + "\n\n詳しくはアプリでご確認ください。\n" + g.url + "\n\n※このメールは送信専用です。お問い合わせは管理者へ直接ご連絡ください。";
      try { await transport.sendMail({ from: FROM, bcc: g.to, subject, text }); mails++; }
      catch (e) { failed++; console.log("メールを送れませんでした(" + k + "): " + (e && e.message)); }
    }
  }
  /* 送れなかった宛先の分も消す(次の回に同じものを何度も送らないため。アプリのお知らせには残っている) */
  for (const r of done) await r.delete();
}
console.log("お知らせ: プッシュ通知 " + pushes + "件" + (transport ? "・メール " + mails + "通" : "(メールは MAIL_USER・MAIL_PASS がないので送りません)")
  + (gone ? "・届かなくなった端末 " + gone + "件を消しました" : "") + (failed ? "・送れなかったもの " + failed + "件" : "") + (dropped ? "・送らずに消した送信待ち " + dropped + "件" : ""));
