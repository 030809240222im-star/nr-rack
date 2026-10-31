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
