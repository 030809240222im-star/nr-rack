"""firestore.rules を作る。NRボックス版とスクラップ版(scrap_ で始まるコレクション)は同じ中身なので、1つのひな形から両方を書き出す。
    python3 tools/make-rules.py
管理者のメールアドレスは ADMINS と index.html の NR_CONFIG.adminEmails の両方に書きます。
"""
import pathlib

ADMINS = ["kowa0371@gmail.com", "030809240222im@gmail.com", "aiko.h@shimz.co.jp", "t.hiramatsu@shimz.co.jp", "janki.onimatu@gmail.com", "n.katou@shimz.co.jp", "a.takada@shimz.co.jp", "a-nagashima@shimz.co.jp"]

BLOCK = """
    // ===== {title} =====
    function isApproved{S}() {{
      return signedIn() && exists(/databases/$(database)/documents/{P}approved/$(request.auth.uid));
    }}
    // 会社のメンバー: 会社IDが本人のID(最初に登録した人)か、利用許可(approved)に入っている会社ID(vid)と同じ
    function isMember{S}(id) {{
      return signedIn() && (request.auth.uid == id
        || (exists(/databases/$(database)/documents/{P}approved/$(request.auth.uid))
            && get(/databases/$(database)/documents/{P}approved/$(request.auth.uid)).data.get('vid', request.auth.uid) == id));
    }}
    // 揚重(盛替え)業者: 申請して利用許可(crews)がある人。搬出予定を見て、搬出確認と戻しの✅だけ付けられる
    function isCrew{S}() {{
      return signedIn() && exists(/databases/$(database)/documents/{P}crews/$(request.auth.uid));
    }}

    // 回収日・設定: 管理者・利用中の業者・盛替え業者が読む。書けるのは管理者だけ
    match /{P}config/{{id}} {{
      allow read: if isAdmin() || isApproved{S}() || isCrew{S}();
      allow write: if isAdmin();
    }}
    match /{P}days/{{id}} {{
      allow read: if isAdmin() || isApproved{S}() || isCrew{S}();
      allow write: if isAdmin();
    }}
    // 確定した回収: 行(rows)は管理者だけ。盛替え業者は行ごとの搬出確認・戻し(st)と履歴(hist)だけ書き換えられる
    match /{P}confirmed/{{id}} {{
      allow read: if isAdmin() || isApproved{S}() || isCrew{S}();
      allow write: if isAdmin();
      allow update: if isCrew{S}() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['st', 'at', 'hist']);
    }}

    // 業者の入力: 本人(利用中)と管理者。盛替え業者は戻したときの台数(floors)だけ書き換えられる
    match /{P}vendors/{{id}} {{
      allow read: if isAdmin() || isMember{S}(id) || isCrew{S}();
      allow write: if isAdmin() || (isMember{S}(id) && isApproved{S}());
      allow update: if isCrew{S}() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['floors', 'updated']);
    }}

    // 業者の登録内容: 本人が出し、管理者が見る
    match /{P}members/{{id}} {{
      allow read: if isAdmin() || isSelf(id);
      allow delete: if isAdmin();
      allow create, update: if isAdmin() || (isSelf(id)
        && request.resource.data.keys().hasOnly(['company', 'contact', 'email', 'at'])
        && request.resource.data.company is string && request.resource.data.company.size() <= 100
        && request.resource.data.email is string && request.resource.data.email.size() <= 200);
    }}

    // 利用許可: 業者は登録と同時に自分の分を作れる(利用停止された人は作れない)。変更・削除は管理者だけ(本人は参加コードでの会社の入り直しだけできる)
    // 会社ID(vid)は、新しい会社なら本人のID、参加コードで入るならそのコードの会社ID
    match /{P}approved/{{id}} {{
      allow read: if isAdmin() || isSelf(id);
      allow create: if isAdmin() || (isSelf(id)
        && !exists(/databases/$(database)/documents/{P}blocked/$(id))
        && request.resource.data.keys().hasOnly(['company', 'email', 'at', 'vid', 'code', 'name'])
        && (request.resource.data.get('vid', id) == id
            || (request.resource.data.code is string
                && get(/databases/$(database)/documents/{P}codes/$(request.resource.data.code)).data.vid == request.resource.data.vid))
        && request.resource.data.company is string && request.resource.data.company.size() <= 100
        && request.resource.data.email is string && request.resource.data.email.size() <= 200);
      allow update, delete: if isAdmin();
      // 登録した後でも、参加コードで別の会社に入り直せる(会社ID・コード・会社名だけ。コードの会社IDと一致するときだけ)
      allow update: if isSelf(id)
        && !exists(/databases/$(database)/documents/{P}blocked/$(id))
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['vid', 'code', 'company'])
        && request.resource.data.code is string
        && get(/databases/$(database)/documents/{P}codes/$(request.resource.data.code)).data.vid == request.resource.data.vid
        && request.resource.data.company is string && request.resource.data.company.size() <= 100;
    }}
    // 利用停止: 管理者だけが付け外しできる
    match /{P}blocked/{{id}} {{
      allow read: if isAdmin() || isSelf(id);
      allow write: if isAdmin();
    }}
    // 追加した台数の記録: 会社のメンバーは読むだけ。書けるのは管理者だけ
    match /{P}plans/{{id}} {{
      allow read: if isAdmin() || isMember{S}(id);
      allow write: if isAdmin();
    }}
    // 追加注文: 業者が自分の分を出し、管理者が手配と上げた日を書き込む
    match /{P}orders/{{id}} {{
      allow read: if isAdmin() || isMember{S}(id) || isCrew{S}();
      allow write: if isAdmin() || (isMember{S}(id) && isApproved{S}());
    }}

    // 業者へのお知らせ: 管理者が出し、業者本人は「確認した」(ack)だけ書ける
    match /{P}notices/{{id}} {{
      allow read: if isAdmin() || isMember{S}(id);
      allow write: if isAdmin();
      allow update: if isMember{S}(id) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['ack']);
    }}
    // 参加コード: コードを知っている人だけが1件ずつ読める(一覧は管理者だけ)。会社のメンバーと管理者が作る
    match /{P}codes/{{code}} {{
      allow get: if signedIn();
      allow list: if isAdmin();
      allow create: if isAdmin() || (isApproved{S}() && isMember{S}(request.resource.data.vid)
        && request.resource.data.keys().hasOnly(['vid', 'company', 'at']));
      allow update, delete: if isAdmin();
    }}

    // 盛替え業者の登録内容: 本人が出し、管理者が見る
    match /{P}crewreq/{{id}} {{
      allow read: if isAdmin() || isSelf(id);
      allow delete: if isAdmin();
      allow create, update: if isAdmin() || (isSelf(id)
        && request.resource.data.keys().hasOnly(['company', 'contact', 'email', 'at'])
        && request.resource.data.company is string && request.resource.data.company.size() <= 100
        && request.resource.data.email is string && request.resource.data.email.size() <= 200);
    }}
    // 盛替え業者の利用許可: 本人は申請と同時に自分の分を作れる(利用停止された人は作れない)。変更・削除は管理者だけ
    match /{P}crews/{{id}} {{
      allow read: if isAdmin() || isSelf(id);
      allow create: if isAdmin() || (isSelf(id)
        && !exists(/databases/$(database)/documents/{P}crewblocked/$(id))
        && request.resource.data.keys().hasOnly(['company', 'email', 'at', 'name'])
        && request.resource.data.company is string && request.resource.data.company.size() <= 100
        && request.resource.data.email is string && request.resource.data.email.size() <= 200);
      allow update, delete: if isAdmin();
    }}
    // 盛替え業者の利用停止: 管理者だけが付け外しできる
    match /{P}crewblocked/{{id}} {{
      allow read: if isAdmin() || isSelf(id);
      allow write: if isAdmin();
    }}
    // 最終ログイン: 本人が開いた時刻だけを書き、管理者が読む
    match /{P}seen/{{id}} {{
      allow read, delete: if isAdmin();
      allow create, update: if isSelf(id)
        && request.resource.data.keys().hasOnly(['at', 'email', 'kind'])
        && request.resource.data.at is string && request.resource.data.at.size() <= 40
        && request.resource.data.email is string && request.resource.data.email.size() <= 200
        && request.resource.data.kind in ['admin', 'vendor', 'crew'];
    }}
    // メールの送信待ち: アプリが入れ、GitHub Actions(サーバー)が送って消す。業者・盛替え業者へのお知らせは管理者(と搬出確認の盛替え業者)だけが入れられる
    match /{P}outbox/{{id}} {{
      allow read, delete: if isAdmin();
      allow create, update: if signedIn()
        && request.resource.data.keys().hasOnly(['to', 'vid', 'd', 'msg', 'at', 'uid'])
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.msg is string && request.resource.data.msg.size() <= 600
        && (isAdmin()
            || request.resource.data.to == 'admin'
            || (request.resource.data.to == 'vendor' && isCrew{S}()));
    }}
"""

HEAD = """rules_version = '2';
// NRボックス ラック調整 と スクラップ搬出 調整 のセキュリティルール
// このファイルは tools/make-rules.py で作っています。直すときはスクリプトを直して作り直してください。
service cloud.firestore {{
  match /databases/{{database}}/documents {{
    function adminEmails() {{ return [{admins}]; }}

    function signedIn() {{ return request.auth != null; }}
    function isAdmin() {{
      return signedIn()
        && request.auth.token.email_verified == true
        && request.auth.token.email.lower() in adminEmails();
    }}
    function isSelf(id) {{ return signedIn() && request.auth.uid == id; }}
"""

out = HEAD.format(admins=", ".join("'%s'" % a for a in ADMINS))
out += BLOCK.format(title="NRボックス", S="", P="")
out += BLOCK.format(title="スクラップ搬出(scrap_ で始まるコレクション)", S="Scrap", P="scrap_")
out += "  }\n}\n"
root = pathlib.Path(__file__).resolve().parent.parent
(root / "firestore.rules").write_text(out, encoding="utf-8")
print("wrote firestore.rules")
