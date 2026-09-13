const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/server/src/learning-store.js";
let t = fs.readFileSync(p, "utf8");
const before = t;

// 删除提前定义的 getSessionWithPractice
t = t.replace(
`  function getSessionWithPractice(userId, id) {
    const session = getSession(userId, id);
    if (!session) return null;
    return { ...session, practice: listPractice(userId, id) };
  }

  function getSession(userId, id) {`,
`  function getSession(userId, id) {`
);

// 在 getSession 之后追加正确实现
const marker = `  function getSessionForLearning(userId, id) {`;
t = t.replace(
  marker,
`  function getSessionWithPractice(userId, id) {
    const session = getSession(userId, id);
    if (!session) return null;
    return { ...session, practice: listPractice(userId, id) };
  }

  function getSessionForLearning(userId, id) {`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("ORDER_FIXED");