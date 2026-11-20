/* データの点検(読むだけ。何も書き換えない)。GitHub の「check」を手で動かすと、ログに件数と最後に保存された時刻だけを出す。
   リポジトリは公開なので、名前・メールアドレス・会社名・階などの中身は出さない。 */
import admin from "firebase-admin";
const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "null");
if (!sa) { console.log("FIREBASE_SERVICE_ACCOUNT がないので終了します"); process.exit(0); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const { getFirestore } = await import("firebase-admin/firestore");
const db = getFirestore(admin.app(), process.env.FIRESTORE_DB || "default");
const jst = t => t ? new Date(t.getTime() + 9 * 36e5).toISOString().slice(0, 16).replace("T", " ") : "なし";
const COLLS = ["seen", "approved", "members", "crews", "vendors", "days", "confirmed", "notices", "inbox", "sent", "orders", "plans", "push", "outbox", "maillog", "config"];
const now = Date.now();
for (const P of ["", "scrap_"]) {
  console.log("===== " + (P ? "スクラップ版" : "NRボックス版") + "(データベース: " + (process.env.FIRESTORE_DB || "default") + ")");
  for (const c of COLLS) {
    const s = await db.collection(P + c).get();
    let newest = null, day = 0;
    s.forEach(d => { const t = d.updateTime && d.updateTime.toDate(); if (t) { if (!newest || t > newest) newest = t; if (now - t.getTime() < 864e5) day++; } });
    let extra = "";
    if (c === "seen") {
      const k = {}; let lastAt = "";
      s.forEach(d => { const x = d.data() || {}; k[x.kind || "?"] = (k[x.kind || "?"] || 0) + 1; if ((x.at || "") > lastAt) lastAt = x.at || ""; });
      extra = " / 種類別 " + JSON.stringify(k) + " / 記録の中の最新 " + (lastAt ? jst(new Date(lastAt)) : "なし");
      /* 1件ずつ: 保存された時刻・記録の中の時刻(at)・種類。誰の記録かは出さない */
      const rows = []; s.forEach(d => { const x = d.data() || {}; rows.push([d.updateTime ? d.updateTime.toDate() : null, x.at, x.kind, typeof x.at]); });
      rows.sort((a, b) => (b[0] || 0) - (a[0] || 0));
      extra += "\n" + rows.map(r => "    保存 " + jst(r[0]) + " / 記録の時刻 " + (r[1] ? (r[3] === "string" ? jst(new Date(r[1])) + " (" + String(r[1]).slice(0, 24) + ")" : "文字でない(" + r[3] + ")") : "なし") + " / " + (r[2] || "?")).join("\n");
    }
    if (c === "confirmed") {
      let vr = 0; s.forEach(d => { if (Object.keys((d.data() || {}).vr || {}).length) vr++; });
      extra = " / 業者が確定後に変えた日 " + vr + "件";
    }
    console.log(c.padEnd(10) + " " + String(s.size).padStart(4) + "件  最後の保存 " + jst(newest) + "  (24時間以内に保存 " + day + "件)" + extra);
  }
}
