const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/server/src/learning-store.js";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`  function createCategory(userId, name, color) {
    const now = new Date().toISOString();`,
`  function createCategory(userId, name, color) {
    if (typeof userId === 'object' && userId !== null) {
      const payload = userId;
      return createCategory(payload.userId, payload.name, payload.color);
    }
    const now = new Date().toISOString();`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("CREATE_CATEGORY_FLEXIBLE");