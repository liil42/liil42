const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/server/src/learning-store.js";
const lines = fs.readFileSync(p, "utf8").split("\n");
// 在第 440 行（getSessionForLearning 定义）之前插入 getSessionWithPractice
const idx = lines.findIndex((l) => l.includes("function getSessionForLearning(userId, sessionId) {"));
if (idx < 0) { console.error("MARKER_NOT_FOUND"); process.exit(1); }
const block = [
  "  function getSessionWithPractice(userId, id) {",
  "    const session = getSession(userId, id);",
  "    if (!session) return null;",
  "    return { ...session, practice: listPractice(userId, id) };",
  "  }",
  ""
];
lines.splice(idx, 0, ...block);
fs.writeFileSync(p, lines.join("\n"));
console.log("INSERTED_AT_LINE_" + (idx + 1));