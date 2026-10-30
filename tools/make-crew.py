"""盛替え業者用のページを作る。NRボックス版(index.html)から crew/index.html、スクラップ版(scrap/index.html)から scrap/crew/index.html。

index.html を直したら、make-scrap.py のあとにこのスクリプトも実行する:
    python3 tools/make-scrap.py && python3 tools/make-crew.py
中身は同じアプリで、window.NR_CREW を立てて盛替え業者の画面(登録・カレンダー・戻し一覧)で開く。
"""
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
for src, dst in (("index.html", "crew/index.html"), ("scrap/index.html", "scrap/crew/index.html")):
    s = (root / src).read_text(encoding="utf-8")
    mark = '<script type="module">'
    assert s.count(mark) == 1
    s = s.replace(mark, "<script>window.NR_CREW=true;</script>\n" + mark)
    s = s.replace("調整</title>", "調整 盛替え</title>", 1)
    out = root / dst
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(s, encoding="utf-8")
    print("wrote", dst)
