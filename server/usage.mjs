/* サーバーの1日の使用量(Google Cloud の利用状況)を読む。読むだけ。
   サービスアカウントに「モニタリング閲覧者」(roles/monitoring.viewer)の役割がないと読めない(そのときは null を返す)。
   Firestore Enterprise 版の無料の範囲(1日): 読み取り 50,000 単位・書き込み 40,000 単位・画面への自動更新 50,000 単位。毎日17時(日本時間)に戻る */
export const LIMITS = { read: 50000, write: 40000, realtime: 50000 };
export const LABEL = { read: "読み取り", write: "書き込み", realtime: "画面への自動更新" };
const kindOf = t => /realtime|real_time|snapshot|listen/i.test(t) ? "realtime" : /write|delete/i.test(t) ? "write" : /read/i.test(t) ? "read" : null;
/* start〜end(Date)の合計を、メトリクスごとと種類ごと(一番大きいもの)で返す。hours: 1時間ごとの内訳も返す */
export async function usage(admin, sa, start, end) {
  let token;
  try { token = (await admin.credential.cert(sa).getAccessToken()).access_token; } catch (e) { return null; }
  const P = "https://monitoring.googleapis.com/v3/projects/" + sa.project_id;
  const get = async u => { const r = await fetch(u, { headers: { Authorization: "Bearer " + token } }); return { ok: r.ok, status: r.status, j: await r.json().catch(() => null) }; };
  const ds = await get(P + "/metricDescriptors?" + new URLSearchParams({ filter: 'metric.type = starts_with("firestore.googleapis.com/")' }));
  if (!ds.ok) return { error: ds.status };
  const types = (ds.j.metricDescriptors || []).filter(d => d.metricKind === "DELTA" && /INT64|DOUBLE/.test(d.valueType)).map(d => d.type);
  const metrics = {}, hours = {}, by = { read: 0, write: 0, realtime: 0 };
  for (const t of types) {
    const q = new URLSearchParams({ filter: 'metric.type="' + t + '"', "interval.startTime": start.toISOString(), "interval.endTime": end.toISOString(),
      "aggregation.alignmentPeriod": "3600s", "aggregation.perSeriesAligner": "ALIGN_SUM", "aggregation.crossSeriesReducer": "REDUCE_SUM" });
    const r = await get(P + "/timeSeries?" + q);
    if (!r.ok) continue;
    let sum = 0; const h = {};
    for (const s of (r.j.timeSeries || [])) for (const p of (s.points || [])) { const v = Number(p.value.int64Value || p.value.doubleValue || 0); sum += v; h[p.interval.endTime] = (h[p.interval.endTime] || 0) + v; }
    metrics[t] = Math.round(sum); hours[t] = h;
    const k = kindOf(t.replace("firestore.googleapis.com/", ""));
    if (k && /unit|count/i.test(t) && sum > by[k]) by[k] = Math.round(sum);
  }
  return { metrics, hours, by };
}
/* 日本時間の「今日の上限の区切り」(17時)。直前の17時から今まで = 今日の分 */
export function quotaDayStart(now = new Date()) {
  const j = new Date(now.getTime() + 9 * 36e5); const s = new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate(), 17) - 9 * 36e5);
  return s > now ? new Date(s.getTime() - 864e5) : s;
}
