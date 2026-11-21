"""NRボックス版(index.html)から、同じ仕組みのスクラップ搬出版(scrap/index.html)を作る。

NRボックス版を直したら、このスクリプトを実行してスクラップ版も作り直す:
    python3 tools/make-scrap.py
データは同じFirebaseの scrap_ で始まるコレクションに分けて保存される。
"""
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
s = (root / "index.html").read_text(encoding="utf-8")


def rep(old, new, count=None):
    global s
    n = s.count(old)
    assert n and (count is None or n == count), (old, n)
    s = s.replace(old, new)


rep("<title>NRボックス ラック調整</title>", "<title>スクラップ搬出 調整</title>", 1)
rep("NRボックス ラック調整", "スクラップ搬出 調整")
rep("NRボックス", "スクラップ台車")
# スクラップは車輌1台で20台まで
rep("evn:5,perTruck:4,", "evn:5,perTruck:20,", 1)
rep('var KEY="nr-rack-planner-v3";', 'var KEY="scrap-planner-v1";', 1)
rep("  databaseId:\"default\",", "  databaseId:\"default\",\n  prefix:\"scrap_\",", 1)
# スクラップ搬出を別の Firebase プロジェクトに分けたら、tools/scrap-firebase.json にそのプロジェクトの「ウェブアプリの設定」を書く
# (apiKey・authDomain・projectId・appId と、databaseId。どれも公開してよい値)。あれば、スクラップ版はそちらにつなぐ
import json, re
cfgp = root / "tools" / "scrap-firebase.json"
if cfgp.exists():
    c = json.loads(cfgp.read_text(encoding="utf-8"))
    fb = "  firebase:{\n" + ",\n".join('    %s:%s' % (k, json.dumps(c[k])) for k in ("apiKey", "authDomain", "projectId", "appId") if k in c) + "\n  },"
    s, n = re.subn(r"  firebase:\{\n.*?\n  \},", lambda m: fb, s, count=1, flags=re.S)
    assert n == 1
    rep('  databaseId:"default",\n  prefix:"scrap_",', '  databaseId:%s,\n  prefix:"scrap_",' % json.dumps(c.get("databaseId", "(default)")), 1)
    print("scrap: separate Firebase project", c.get("projectId"))
(root / "scrap" / "index.html").write_text(s, encoding="utf-8")
print("wrote scrap/index.html")
