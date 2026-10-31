"""取扱説明書のPDFを manuals/*.md から作る。1ページ目の [[QR]] の位置にQRコードを入れる。

    python3 tools/make-manuals.py
必要なもの: pip install markdown、Node.js と playwright(Chromium)、qrcode-generator(npm)。
業者用と盛替え業者用はリポジトリに置いて公開する。管理者用は管理者のメールアドレスが書いてあるので公開せず、manuals/out/ に作る。
"""
import json, pathlib, subprocess, markdown

root = pathlib.Path(__file__).resolve().parent.parent
base = "https://030809240222im-star.github.io/nr-rack/"
BOOKS = [
    ("vendor", "業者用 取扱説明書", [("NRボックス ラック調整", base), ("スクラップ搬出 調整", base + "scrap/")], root / "vendor-manual.pdf"),
    ("crew", "盛替え業者用 取扱説明書", [("NRボックス(盛替え業者用)", base + "crew/"), ("スクラップ搬出(盛替え業者用)", base + "scrap/crew/")], root / "crew-manual.pdf"),
    ("admin", "管理者用 取扱説明書", [("NRボックス(管理者・業者)", base), ("お試し版(ログイン不要)", base + "demo/")], root / "manuals" / "out" / "admin-manual.pdf"),
]
CSS = """<style>
@page{size:A4;margin:16mm 15mm}
body{font-family:"IPAGothic","Hiragino Sans","Yu Gothic",sans-serif;color:#13222b;font-size:10.5pt;line-height:1.65}
h1{font-size:19pt;margin:0 0 2mm;color:#1d5fc4}
.sub{color:#5b6b74;margin:0 0 6mm}
h2{font-size:13pt;border-left:5px solid #1d5fc4;padding-left:3mm;margin:7mm 0 3mm;break-after:avoid}
table{border-collapse:collapse;width:100%;margin:2mm 0 3mm;break-inside:avoid}
th,td{border:1px solid #c9d2d8;padding:1.6mm 2.5mm;text-align:left;vertical-align:top;word-break:break-all}
th{background:#eef2f5}
ol,ul{margin:1mm 0 3mm;padding-left:6mm} li{margin:.8mm 0}
.qrs{display:flex;gap:8mm;margin:3mm 0 4mm;break-inside:avoid}
.qr{flex:1;border:1.5px solid #1d5fc4;border-radius:3mm;padding:4mm;text-align:center}
.qr svg{width:42mm;height:42mm;display:block;margin:2mm auto}
.qr b{font-size:12pt}.qr .u{font-size:8pt;color:#5b6b74;word-break:break-all}
</style>"""
QR_JS = """const q=require('qrcode-generator');const a=JSON.parse(process.argv[1]);
console.log(JSON.stringify(a.map(u=>{const x=q(0,'M');x.addData(u);x.make();return x.createSvgTag({cellSize:4,margin:2,scalable:true})})))"""
PDF_JS = """const {chromium}=require('playwright');const [src,out]=process.argv.slice(1);
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+src);
await p.pdf({path:out,format:'A4',printBackground:true,preferCSSPageSize:true});await b.close()})();"""

out_dir = root / "manuals" / "out"
out_dir.mkdir(parents=True, exist_ok=True)
for name, sub, qrs, pdf in BOOKS:
    svgs = json.loads(subprocess.check_output(["node", "-e", QR_JS, json.dumps([u for _, u in qrs])]))
    box = '<div class="qrs">' + "".join('<div class="qr"><b>%s</b>%s<div class="u">%s</div></div>' % (t, s, u) for (t, u), s in zip(qrs, svgs)) + "</div>"
    body = markdown.markdown((root / "manuals" / (name + ".md")).read_text(encoding="utf-8"), extensions=["tables"]).replace("<p>[[QR]]</p>", box)
    html = out_dir / (name + ".html")
    html.write_text('<!doctype html><html lang="ja"><head><meta charset="utf-8">%s</head><body><h1>NRボックス・スクラップ搬出 調整アプリ</h1><p class="sub">%s</p>%s</body></html>' % (CSS, sub, body), encoding="utf-8")
    subprocess.check_call(["node", "-e", PDF_JS, str(html), str(pdf)])
    print("wrote", pdf.relative_to(root))
