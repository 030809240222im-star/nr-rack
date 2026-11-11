# NRボックス ラック調整 / スクラップ搬出 調整

公開先: https://030809240222im-star.github.io/nr-rack/ (GitHub Pages、main ブランチ)。データは Firebase(nr-rack、Firestore の DB ID は `default`)。

## 直すのは index.html だけ

`scrap/`、`crew/`、`scrap/crew/`、`demo/` は index.html から作るので、直接直さない。index.html を直したら必ず作り直す:

    python3 tools/make-scrap.py && python3 tools/make-crew.py && python3 tools/make-demo.py

セキュリティルールは `tools/make-rules.py` で作る(管理者のメールアドレスもここ)。ルールを変えたら、利用者に Firebase へ貼り直してもらう必要があると必ず伝える。

## 取扱説明書も一緒に直す

使い方が変わる変更をしたら、同じ作業の中で取扱説明書も直す。

- 原稿: `manuals/vendor.md`(業者用)、`manuals/admin.md`(管理者用)、`manuals/crew.md`(盛替え業者用)
- PDF: `python3 tools/make-manuals.py`。業者用 `vendor-manual.pdf` と盛替え業者用 `crew-manual.pdf` は公開する。管理者用は `manuals/out/admin-manual.pdf`(公開しない)
- claude.ai の編集できる版(Claude Docs)も同じ内容にそろえる: 業者用 https://claude.ai/artifact/PAaHJ3U6k3PwvKiHMxzcMT 、管理者用 https://claude.ai/artifact/8mrg83hkEu6R1P1D7fKQz1 、盛替え業者用 https://claude.ai/artifact/HeRW8VjFzFT3FUariLgy1m

## 複数人で開発するとき

- 作業を始める前に必ず `git pull origin main` で最新にする(index.html は1ファイルなので、古いまま直すとぶつかる)。
- 大きな変更はブランチを切ってプルリクエストにし、もう1人に見てもらってから main に入れる。小さな修正は main に直接でもよい。
- ルール(firestore.rules)や管理者のメールアドレスを変えたら、Firebase に貼り直す人を決めて、相手にも伝える。

## 動作確認(試験)

`tests/` に、本番のFirebaseを使わない試験があります(Firebase の代わりに `tests/lib/fake-fb.js` を使う)。

    npm install playwright   # 初回だけ(Chromium も必要: npx playwright install chromium)
    node tests/run.js        # 全部
    node tests/run.js fill   # 名前に fill を含むものだけ

直したら、関係する試験と `ipad`(画面の幅)を動かしてから push する。新しい機能には `tests/cases/` に試験を足す。
