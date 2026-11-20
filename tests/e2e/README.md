# 本物の Firebase での確認(エミュレーター)

`tests/run.js` の試験は偽の Firebase(tests/lib/fake-fb.js)を使います。ここでは、本物の Firebase の部品(npm の firebase@10.12.2)と手元のエミュレーター(Firestore・ログイン)で、アプリの保存が本当にサーバーに届くかを確かめます(本番の Firebase は使いません)。Java が必要です。

    cd tests/e2e
    npm i firebase@10.12.2 esbuild firebase-tools playwright   # 初回だけ
    cp ../../firestore.rules .   # 毎回(最新のルールで確かめる)
    npx esbuild entry.js --bundle --format=esm --platform=browser --outfile=fb.js
    npx firebase emulators:exec --only firestore,auth --project nr-rack "node e2e.js"

確かめること: 業者の最終ログイン・出したい台数がサーバーに届く/同じ端末の2つ目の画面からも届く/電波がないときは「未送信」と出て、つながると届く/管理者に業者の台数が見える/管理者の確定(サーバーで確かめてから作る)/業者の確定後の変更(本物のルール)。保存や通信のしかた(openStore)を変えたら、必ず動かしてください。
