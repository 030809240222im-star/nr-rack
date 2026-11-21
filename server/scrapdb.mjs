/* スクラップ版のデータベース。スクラップを別の Firebase プロジェクトに分けたあとは、GitHub の Secrets に
   FIREBASE_SERVICE_ACCOUNT_SCRAP(そのプロジェクトのサービスアカウントの鍵)を入れると、そちらを使う。
   ないあいだは、NRボックスと同じデータベース(scrap_ で始まる集まり)を使う */
export function scrapSa() { return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_SCRAP || "null"); }
export function scrapDb(admin, getFirestore, nrDb) {
  const sb = scrapSa(); if (!sb) return nrDb;
  const a = admin.initializeApp({ credential: admin.credential.cert(sb) }, "scrap");
  return getFirestore(a, process.env.FIRESTORE_DB_SCRAP || "(default)");
}
