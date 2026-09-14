const fs = require("fs");
const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  const m = t.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const sample = (m.slice(0, 6)).join(" | ");
  console.log(f.split("\\").slice(-2).join("/"), "=>", sample);
  console.log("   CODES:", [...(m[0] || "")].map(c => c.codePointAt(0).toString(16)).join(","));
}