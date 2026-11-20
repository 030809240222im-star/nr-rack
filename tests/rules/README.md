# ルールの試験(Firestore エミュレーター)

`firestore.rules` を、本物のルールの仕組みで確かめます(本番の Firebase は使いません)。Java が必要です。

    cd tests/rules
    npm i firebase-tools @firebase/rules-unit-testing firebase   # 初回だけ
    cp ../../firestore.rules .   # 毎回(最新のルールで確かめる)
    npx firebase emulators:exec --only firestore --project demo-nr "node vedit.mjs && node roles.mjs"

`OK` が並べば通っています。vedit.mjs は業者による確定後の変更、roles.mjs は管理者・業者・盛替え業者のふだんの書き込み(最終ログインの記録を含む)を、NRボックス版・スクラップ版の両方で確かめます。ルール(tools/make-rules.py)を変えたら動かしてください。
