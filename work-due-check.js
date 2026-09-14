const fs = require("fs");

// 后端支持 status=due 筛选
const p = "F:/AI-codex/daimaxuexi/server/src/index.js";
let t = fs.readFileSync(p, "utf8");
const before = t;
t = t.replace(
`app.get('/api/mistakes', requireAuth, (req, res, next) => {`,
`app.get('/api/mistakes', requireAuth, (req, res, next) => {`
);
fs.writeFileSync(p, t);

// 查看现有 list 路由实现
const lines = t.split("\n");
const idx = lines.findIndex((l) => l.includes("app.get('/api/mistakes'"));
console.log(lines.slice(idx, idx + 18).join("\n"));