# nr-rack

NRボックス ラック調整(Web版)。業者が入力した階別のNRボックス保有・搬出希望を、回収日ごとの台数・時間・エレベーター集積に合わせて配分します。

- `index.html` — アプリ本体(GitHub Pagesで公開)
- `firestore.rules` — Firebase Firestore のセキュリティルール
- `公開手順.md` — Firebaseの準備と公開の手順

## スクラップ搬出版

同じ仕組みのスクラップ搬出アプリが `scrap/` にあります(URL の末尾に `/scrap/`)。
ログインは共通、データは Firebase の `scrap_` で始まるコレクションに分けて保存されます。

`scrap/index.html` は `tools/make-scrap.py` で `index.html` から作っています。
NRボックス版を直したら `python3 tools/make-scrap.py` を実行して作り直してください。
