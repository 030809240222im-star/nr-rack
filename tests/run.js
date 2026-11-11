/* 動作確認(試験)をまとめて動かす。Firebase の代わりに tests/lib/fake-fb.js を使うので、本番のデータには触れない。
   使い方: npm install playwright を一度してから  node tests/run.js        (全部)
                                                 node tests/run.js fill  (名前に fill を含むものだけ)
   各試験の出力を表示し、エラー(ERR・例外)が出たものを最後に一覧にする。結果の数字が正しいかは、出力を目で確かめる。 */
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const dir = path.join(__dirname, "cases"), work = path.join(__dirname, ".work");
fs.mkdirSync(work, { recursive: true });
for (const f of ["fake-fb.js", "qrcode.min.js"]) fs.copyFileSync(path.join(__dirname, "lib", f), path.join(work, f));
const only = process.argv[2] || "";
const bad = [];
for (const f of fs.readdirSync(dir).filter(x => /\.(m?js)$/.test(x) && x.includes(only)).sort()) {
  const title = (fs.readFileSync(path.join(dir, f), "utf8").split("\n")[0] || "").replace(/^\/\/\s*/, "");
  console.log("\n=== " + f + "  " + title);
  const r = spawnSync(process.execPath, [path.join(dir, f)], { cwd: work, encoding: "utf8", timeout: 180000, env: process.env });
  const out = (r.stdout || "") + (r.stderr || "");
  console.log(out.trim());
  if (r.status !== 0 || /\bERR\b|Error:|TypeError|ReferenceError/.test(out)) bad.push(f);
}
console.log("\n" + (bad.length ? "エラーが出たもの: " + bad.join(", ") : "エラーは出ませんでした(数字の正しさは上の出力で確かめてください)"));
process.exit(bad.length ? 1 : 0);
