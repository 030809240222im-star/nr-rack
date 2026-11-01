"""firestore.rules を作る。NRボックス版とスクラップ版(scrap_ で始まるコレクション)は同じ中身なので、1つのひな形から両方を書き出す。
    python3 tools/make-rules.py
管理者のメールアドレスは ADMINS と index.html の NR_CONFIG.adminEmails の両方に書きます。
"""
import pathlib

ADMINS = ["kowa0371@gmail.com", "030809240222im@gmail.com"]

BLOCK = """
    // ===== {title} =====
    function isApproved{S}() {{
      return signedIn() && exists(/databases/$(database)/documents/{P}approved/$(request.auth.uid));
    }}
    // 盛替え業者: 申請して利用許可(crews)がある人
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
      allow read: if isAdmin() || isSelf(id) || isCrew{S}();
      allow write: if isAdmin() || (isSelf(id) && isApproved{S}());
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

    // 利用許可: 業者は登録と同時に自分の分を作れる(利用停止された人は作れない)。変更・削除は管理者だけ
    match /{P}approved/{{id}} {{
      allow read: if isAdmin() || isSelf(id);
      allow create: if isAdmin() || (isSelf(id)
        && !exists(/databases/$(database)/documents/{P}blocked/$(id))
        && request.resource.data.keys().hasOnly(['company', 'email', 'at'])
        && request.resource.data.company is string && request.resource.data.company.size() <= 100
        && request.resource.data.email is string && request.resource.data.email.size() <= 200);
      allow update, delete: if isAdmin();
    }}
    // 利用停止: 管理者だけが付け外しできる
    match /{P}blocked/{{id}} {{
      allow read: if isAdmin() || isSelf(id);
      allow write: if isAdmin();
    }}
    // 追加した台数の記録: 本人は読むだけ。揚重(盛替え)業者は追加注文を上げたときに記録を足せる
    match /{P}plans/{{id}} {{
      allow read: if isAdmin() || isSelf(id) || isCrew{S}();
      allow write: if isAdmin();
      allow create, update: if isCrew{S}() && request.resource.data.keys().hasOnly(['logs', 'at']);
    }}
    // 追加注文: 業者が自分の分を出し、管理者と揚重(盛替え)業者が手配と上げた日を書き込む
    match /{P}orders/{{id}} {{
      allow read: if isAdmin() || isSelf(id) || isCrew{S}();
      allow write: if isAdmin() || (isSelf(id) && isApproved{S}());
      allow update: if isCrew{S}() && request.resource.data.keys().hasOnly(['items', 'at']);
    }}

    // 業者へのお知らせ: 管理者と盛替え業者が出し、業者本人は「確認した」(ack)だけ書ける
    match /{P}notices/{{id}} {{
      allow read: if isAdmin() || isSelf(id) || isCrew{S}();
      allow write: if isAdmin();
      allow create: if isCrew{S}() && request.resource.data.keys().hasOnly(['items']);
      allow update: if isCrew{S}() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['items']);
      allow update: if isSelf(id) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['ack']);
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
        && request.resource.data.keys().hasOnly(['company', 'email', 'at'])
        && request.resource.data.company is string && request.resource.data.company.size() <= 100
        && request.resource.data.email is string && request.resource.data.email.size() <= 200);
      allow update, delete: if isAdmin();
    }}
    // 盛替え業者の利用停止: 管理者だけが付け外しできる
    match /{P}crewblocked/{{id}} {{
      allow read: if isAdmin() || isSelf(id);
      allow write: if isAdmin();
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
