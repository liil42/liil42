const { extractJson, friendlyError } = require("F:/AI-codex/daimaxuexi/server/src/ai.js");
const cases = [
  "{\"a\":1}",
  "\`\`\`json\n{\"a\":2}\n\`\`\`",
  "好的，结果是：{\"a\":3} 以上。",
  "前言 {\"b\":{\"c\":[1,2]}} 结尾",
  "[{\"x\":1}]"
];
let pass = 0;
for (const c of cases) {
  try { const v = extractJson(c); pass += 1; console.log("PASS JSON ->", JSON.stringify(v)); }
  catch (e) { console.log("FAIL JSON ->", c.slice(0, 24), e.message); }
}
console.log("json_pass=" + pass + "/" + cases.length);
console.log("friendly(timeout)=" + friendlyError(new Error("This operation was aborted")));
console.log("friendly(net)=" + friendlyError(new Error("fetch failed")));
console.log("friendly(401)=" + friendlyError(new Error("AI 服务返回 401：unauthorized")));
console.log("friendly(unknown)=" + friendlyError(new Error("boom")));