const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/index.html";
let t = fs.readFileSync(p, "utf8");
if (!t.includes("data-theme")) {
  t = t.replace('<html lang="zh-CN">', '<html lang="zh-CN" data-theme="dark">');
  fs.writeFileSync(p, t);
  console.log("HTML_THEME_SET");
} else {
  console.log("HTML_THEME_EXISTS");
}
console.log(t.slice(0, 300));