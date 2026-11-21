/* スクラップ搬出を別の Firebase プロジェクトに分けるときに1回だけ動かす(GitHub の Actions →「migrate-scrap」)。
   今のプロジェクトの scrap_ で始まる集まりを、新しいプロジェクトへ写す(新しい側にまだ何もないときだけ。今の側は消さない)。
   ログインはプロジェクトごとなので、利用者は新しい側で登録し直す(業者・盛替え業者の承認もやり直す)。
   そのため、人に結びついた記録(承認・登録・最終ログイン・通知の登録)は写さず、設定と業務のデータだけを写す */
import admin from "firebase-admin";
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "null");
const sb = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_SCRAP || "null");
if (!sa || !sb) { console.log("FIREBASE_SERVICE_ACCOUNT と FIREBASE_SERVICE_ACCOUNT_SCRAP の両方が要ります"); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const b = admin.initializeApp({ credential: admin.credential.cert(sb) }, "scrap");
const { getFirestore } = await import("firebase-admin/firestore");
const from = getFirestore(admin.app(), process.env.FIRESTORE_DB || "default"), to = getFirestore(b, process.env.FIRESTORE_DB_SCRAP || "(default)");
const COPY = ["config", "days", "confirmed", "orders", "plans"], SKIP = ["approved", "members", "blocked", "codes", "crews", "crewreq", "crewblocked", "seen", "push", "vendors", "notices", "inbox", "sent", "outbox", "maillog"];
for (const c of COPY) { if (!(await to.collection("scrap_" + c).limit(1).get()).empty) { console.log("新しい側に scrap_" + c + " がもうあるので、写すのをやめます"); process.exit(1); } }
for (const c of COPY) {
  const s = await from.collection("scrap_" + c).get(); let n = 0;
  for (const d of s.docs) { await to.collection("scrap_" + c).doc(d.id).set(d.data()); n++; }
  console.log("scrap_" + c + ": " + n + "件を写しました");
}
for (const c of SKIP) { const s = await from.collection("scrap_" + c).get(); if (s.size) console.log("scrap_" + c + ": " + s.size + "件(人に結びつくので写しません。新しい側で登録し直します)"); }
const cfg = (await to.doc("scrap_config/main").get()).data() || {};
if (cfg.vapid) { await to.doc("scrap_config/main").update({ vapid: admin.firestore.FieldValue.delete() }); }
console.log("終わりました");
