"""NRボックス版(index.html)から、ログインなしで試せるお試し版(demo/index.html)を作る。

NRボックス版を直したら、このスクリプトも実行してお試し版を作り直す:
    python3 tools/make-demo.py
お試し版はFirebaseにつながず、データは開いた端末のブラウザ(localStorage)だけに保存する。
"""
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
s = (root / "index.html").read_text(encoding="utf-8")

start = s.index("<script>\n/* ==== 設定")
end = s.index("</script>", s.index('<script type="module">')) + len("</script>")
boot = ('<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>\n'
        "<script>window.NR_DEMO=true;window.nrBoot();</script>")
s = s[:start] + boot + s[end:]
s = s.replace("<title>NRボックス ラック調整</title>", "<title>NRボックス ラック調整 お試し版</title>", 1)
s = s.replace('var KEY="nr-rack-planner-v3";', 'var KEY="nr-rack-demo-v1";', 1)
(root / "demo").mkdir(exist_ok=True)
(root / "demo" / "index.html").write_text(s, encoding="utf-8")
print("wrote demo/index.html")
