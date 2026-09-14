const fs = require("fs");
const path = require("path");
const roots = ["F:/AI-codex/daimaxuexi/client/src", "F:/AI-codex/daimaxuexi/server/src"];
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if ([".js", ".jsx", ".css"].includes(path.extname(e.name))) out.push(full);
  }
  return out;
}
const all = roots.flatMap((r) => walk(r));
const suspects = ["锛", "鐨", "涓€", "鍒", "浠ｇ", "鐞", "瀵煎", "閿欓", "鍘嗗", "璁剧", "鏄剧", "杩欓噷", "鏂囦欢", "缁撴灉"];
let total = 0;
for (const f of all) {
  const t = fs.readFileSync(f, "utf8");
  const hit = suspects.filter((s) => t.includes(s));
  if (hit.length) {
    total += 1;
    console.log("SUSPECT", f.replace("F:/AI-codex/daimaxuexi/", ""), "->", hit.join(","));
  }
  if (/[\uFFFD]/.test(t)) console.log("REPLACEMENT_CHAR", f);
}
console.log("files=" + all.length + " suspect=" + total);