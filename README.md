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

## お試し版

ログインなしで試せるお試し版が `demo/` にあります(URL の末尾に `/demo/`)。
Firebase にはつながず、サンプルデータ入りで始まり、データは開いた端末のブラウザだけに保存されます。

`demo/index.html` は `tools/make-demo.py` で `index.html` から作っています。
NRボックス版を直したら `python3 tools/make-demo.py` も実行して作り直してください。

## 盛替え業者用

盛替え業者用のページが `crew/`(スクラップ版は `scrap/crew/`)にあります。
盛替え業者はここから申請し、管理者が「登録」タブで許可すると、当日の搬出の確認(揃っている・無い・不足)と戻しの完了を入力できます。
「無い」「不足」はその業者のアプリに表示されます。

`crew/index.html` と `scrap/crew/index.html` は `tools/make-crew.py` で作っています。
`index.html` を直したら `python3 tools/make-scrap.py && python3 tools/make-crew.py && python3 tools/make-demo.py` を実行してください。

## セキュリティルール

`firestore.rules` は `tools/make-rules.py` で作っています。管理者のメールアドレスもこのスクリプトに書きます。
