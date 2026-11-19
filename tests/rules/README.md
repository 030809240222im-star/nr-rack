# ルールの試験(Firestore エミュレーター)

`firestore.rules` を、本物のルールの仕組みで確かめます(本番の Firebase は使いません)。Java が必要です。

    cd tests/rules
    npm i firebase-tools @firebase/rules-unit-testing firebase   # 初回だけ
    npx firebase emulators:exec --only firestore --project demo-nr "node vedit.mjs"

`OK` が並べば通っています。ルール(tools/make-rules.py)を変えたら動かしてください。
