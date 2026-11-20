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

/* ===== 書き込みが通るかの試し(データは変わらない): すでにある文書を「新しく作る」と頼み、サーバーの返事の種類を見る。
   ALREADY_EXISTS(6) なら書き込みの窓口は動いている。RESOURCE_EXHAUSTED(8) なら1日の上限に達している */
for (const path of ["config/main", "scrap_config/main"]) {
  const t0 = Date.now();
  try { await db.doc(path).create({ probe: true }); console.log("書き込みの試し " + path + ": 作れてしまった(想定外)"); }
  catch (e) { console.log("書き込みの試し " + path + ": 返事 " + e.code + " " + String(e.details || e.message || "").slice(0, 120) + " (" + (Date.now() - t0) + "ms)"); }
}
/* ===== 全文書の保存時刻(11/18 以降)。どの集まりか・保存時刻・中に書かれた最新の時刻(at など)だけを出す */
{
  const since = Date.parse("2026-11-18T00:00:00+09:00"), all = [];
  const scan = (o, acc) => { if (!o || typeof o !== "object") return; for (const [k, v] of Object.entries(o)) { if (typeof v === "string" && /^20\d\d-\d\d-\d\dT\d\d:\d\d/.test(v)) { if (v > acc.v) acc.v = v; } else if (v && typeof v === "object") scan(v, acc); } };
  for (const P of ["", "scrap_"]) for (const c of COLLS) {
    const s = await db.collection(P + c).get();
    s.forEach(d => { const t = d.updateTime && d.updateTime.toDate(); if (!t || t.getTime() < since) return; const acc = { v: "" }; scan(d.data(), acc); all.push([t, P + c, acc.v]); });
  }
  all.sort((a, b) => a[0] - b[0]);
  console.log("===== 11/18 以降にサーバーに保存された文書(古い順) " + all.length + "件");
  for (const r of all) console.log("  保存 " + jst(r[0]) + ":" + String(r[0].getUTCSeconds()).padStart(2, "0") + "  " + r[1].padEnd(16) + " 中の最新の時刻 " + (r[2] ? jst(new Date(r[2])) : "なし"));
}

/* ===== サーバー側の記録(Google Cloud の利用状況)。読むだけ。件数と結果の種類だけを出す ===== */
const PROJECT = sa.project_id;
let token = null;
try { token = (await admin.credential.cert(sa).getAccessToken()).access_token; } catch (e) { console.log("鍵の取得に失敗: " + (e.code || e.message)); }
const get = async url => { const r = await fetch(url, { headers: { Authorization: "Bearer " + token } }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return { ok: r.ok, status: r.status, j, t }; };
if (token) {
  console.log("===== データベースの設定");
  const dbs = await get("https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases");
  if (dbs.ok) for (const d of (dbs.j.databases || [])) console.log("  " + d.name.split("/").pop() + " / 場所 " + d.locationId + " / 種類 " + d.type + " / 無料枠の対象 " + (d.freeTier === true ? "はい" : d.freeTier === false ? "いいえ" : "不明") + " / 作成 " + (d.createTime || "").slice(0, 10) + " / 削除保護 " + d.deleteProtectionState + " / 状態 " + (d.state || ""));
  else console.log("  読めません(" + dbs.status + ")");
  const bill = await get("https://cloudbilling.googleapis.com/v1/projects/" + PROJECT + "/billingInfo");
  console.log("===== 請求(Blaze)の設定: " + (bill.ok ? (bill.j.billingEnabled ? "請求あり(Blaze)" : "請求なし(無料の Spark)") : "読めません(" + bill.status + ")"));
  const end = new Date(), start = new Date(end.getTime() - 48 * 36e5);
  const ts = async (type, groupBy) => {
    const q = new URLSearchParams({ filter: 'metric.type="' + type + '"', "interval.startTime": start.toISOString(), "interval.endTime": end.toISOString(), "aggregation.alignmentPeriod": "3600s", "aggregation.perSeriesAligner": "ALIGN_SUM", "aggregation.crossSeriesReducer": "REDUCE_SUM" });
    (groupBy || []).forEach(g => q.append("aggregation.groupByFields", g));
    return get("https://monitoring.googleapis.com/v3/projects/" + PROJECT + "/timeSeries?" + q);
  };
  const hourJ = s => jst(new Date(s)).slice(5);
  for (const [label, type, groupBy] of [
    ["書き込み(件/時)", "firestore.googleapis.com/document/write_count", ["resource.label.database_id"]],
    ["読み取り(件/時)", "firestore.googleapis.com/document/read_count", ["resource.label.database_id"]],
    ["削除(件/時)", "firestore.googleapis.com/document/delete_count", ["resource.label.database_id"]],
    ["通信の結果(回/時)", "firestore.googleapis.com/api/request_count", ["resource.label.database_id", "metric.label.response_code", "metric.label.api_method"]],
    ["制限の超過(回/時)", "serviceruntime.googleapis.com/quota/exceeded", ["metric.label.quota_metric"]],
  ]) {
    const r = await ts(type, groupBy);
    console.log("===== " + label + "  [" + type + "]");
    if (!r.ok) { console.log("  読めません(" + r.status + " " + ((r.j && r.j.error && r.j.error.status) || "") + ")"); continue; }
    const series = r.j.timeSeries || [];
    if (!series.length) { console.log("  記録なし"); continue; }
    for (const s of series) {
      const lab = Object.assign({}, s.metric.labels || {}, s.resource.labels || {}); delete lab.project_id;
      const pts = (s.points || []).map(p => [p.interval.endTime, Number(p.value.int64Value || p.value.doubleValue || 0)]).sort((a, b) => a[0] < b[0] ? -1 : 1);
      const tot = pts.reduce((a, p) => a + p[1], 0);
      console.log("  " + JSON.stringify(lab) + " 計 " + tot);
      console.log("    " + pts.filter(p => p[1]).map(p => hourJ(p[0]) + "=" + p[1]).join("  "));
    }
  }
}
