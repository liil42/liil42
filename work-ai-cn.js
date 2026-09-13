const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/server/src/ai.js";
let t = fs.readFileSync(p, "utf8");
const before = t;

// 401/403 等 HTTP 错误在抛出前就转成中文，避免英文原文外泄
t = t.replace(
`    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(\`AI 服务返回 \${response.status}：\${text.slice(0, 300)}\`);
    }`,
`    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (response.status === 401 || response.status === 403) {
        throw new Error('AI 服务鉴权失败：请检查 API Key 是否正确、是否有余额');
      }
      if (response.status === 429) {
        throw new Error('AI 服务请求过于频繁，请稍后再试');
      }
      if (response.status >= 500) {
        throw new Error('AI 服务暂时不可用，请稍后重试');
      }
      throw new Error(\`AI 服务返回 \${response.status}：\${text.slice(0, 120)}\`);
    }`
);

// 兜底：错误信息里若含英文鉴权关键字也转中文
t = t.replace(
`function friendlyError(error) {
  const raw = String((error && error.message) || error || '');`,
`function friendlyError(error) {
  const raw = String((error && error.message) || error || '');
  if (/invalid api key|authentication|unauthorized|insufficient|balance/i.test(raw)) {
    return 'AI 服务鉴权失败，请检查 API Key 是否正确、是否有余额';
  }`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("AI_ERRORS_LOCALIZED");