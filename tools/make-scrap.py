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
rep("var NR_DEF={perTruck:4,", "var NR_DEF={perTruck:20,", 1)
rep('var KEY="nr-rack-planner-v3";', 'var KEY="scrap-planner-v1";', 1)
rep("  databaseId:\"default\",", "  databaseId:\"default\",\n  prefix:\"scrap_\",", 1)
(root / "scrap" / "index.html").write_text(s, encoding="utf-8")
print("wrote scrap/index.html")
