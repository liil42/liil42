const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/server/src/analyzer.js";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
  `const { callAI, extractJson } = require('./ai');`,
  `const { callAI, callAIJson } = require('./ai');`
);

t = t.replace(
  `async function analyzeSnippet(keyRecord, code, language, style) {
  const content = await callAI(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    snippetMessages(code, language, style)
  );
  return extractJson(content);
}`,
  `async function analyzeSnippet(keyRecord, code, language, style) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    snippetMessages(code, language, style),
    0.2
  );
}`
);

t = t.replace(
  `async function annotateCode(keyRecord, code, language) {
  const content = await callAI(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    annotateMessages(code, language),
    0.1
  );
  return extractJson(content);
}`,
  `async function annotateCode(keyRecord, code, language) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    annotateMessages(code, language),
    0.1
  );
}`
);

t = t.replace(
  `async function explainLine(keyRecord, payload) {
  const content = await callAI(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    lineInsightMessages(payload),
    0.1
  );
  return extractJson(content);
}`,
  `async function explainLine(keyRecord, payload) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    lineInsightMessages(payload),
    0.1
  );
}`
);

t = t.replace(
  `async function answerLineQuestion(keyRecord, payload) {
  const content = await callAI(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    lineQuestionMessages(payload),
    0.1
  );
  return extractJson(content);
}`,
  `async function answerLineQuestion(keyRecord, payload) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    lineQuestionMessages(payload),
    0.1
  );
}`
);

t = t.replace(
  `async function reviewUnderstanding(keyRecord, payload) {
  const content = await callAI(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    understandingReviewMessages(payload),
    0.1
  );
  return extractJson(content);
}`,
  `async function reviewUnderstanding(keyRecord, payload) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    understandingReviewMessages(payload),
    0.1
  );
}`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("ANALYZER_UPDATED callAIJson=" + (t.match(/callAIJson/g) || []).length + " extractJson=" + (t.match(/extractJson/g) || []).length);