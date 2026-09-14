const fs = require("fs");

// 1. prompts.js 增加小练习点评提示词
const pp = "F:/AI-codex/daimaxuexi/server/src/prompts.js";
let pt = fs.readFileSync(pp, "utf8");
if (!pt.includes("practiceReviewMessages")) {
  pt += `

function practiceReviewMessages({ code, lineNumber, lineText, practiceType, question, userAnswer }) {
  return [
    {
      role: 'system',
      content: [
        '你是一位耐心、鼓励型的编程启蒙老师，正在检查零基础学员的小练习答案。',
        '请始终先肯定学员理解正确的地方，再补充需要完善的地方，语气温暖、口语化。',
        '一次最多指出两个主要问题，不要堆砌术语，不要使用机械否定。',
        '必须返回严格 JSON，格式如下：',
        '{',
        '  "correct": true 或 false,',
        '  "correct_parts": ["学员答对的地方，最多两条"],',
        '  "missing_parts": ["还可以补充的地方，最多两条"],',
        '  "wrong_parts": [{"what_user_said": "原话", "why_wrong": "为什么需要修正", "correct_understanding": "正确理解"}],',
        '  "encouragement": "一句鼓励的话",',
        '  "standard_explanation": "这道练习的标准答案，用小白能懂的话",',
        '  "suggest_mistake": true 或 false',
        '}'
      ].join('\\n')
    },
    {
      role: 'user',
      content: [
        '原始代码：', code,
        '',
        '第 ' + lineNumber + ' 行：', lineText,
        '',
        '练习类型：' + practiceType,
        '练习题目：' + question,
        '学员答案：' + userAnswer,
        '',
        '请检查并返回 JSON。'
      ].join('\\n')
    }
  ];
}

module.exports.practiceReviewMessages = practiceReviewMessages;
`;
  fs.writeFileSync(pp, pt);
  console.log("PROMPT_ADDED");
} else {
  console.log("PROMPT_ALREADY");
}

// 2. analyzer.js 增加 reviewPractice
const ap = "F:/AI-codex/daimaxuexi/server/src/analyzer.js";
let at = fs.readFileSync(ap, "utf8");
at = at.replace(
`  understandingReviewMessages
} = require('./prompts');`,
`  understandingReviewMessages,
  practiceReviewMessages
} = require('./prompts');`
);
if (!at.includes("reviewPractice")) {
  at = at.replace(
`module.exports = {`,
`async function reviewPractice(keyRecord, payload) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    practiceReviewMessages(payload),
    0.1
  );
}

module.exports = {`
  );
  at = at.replace(
`  reviewUnderstanding,`,
`  reviewUnderstanding,
  reviewPractice,`
  );
}
fs.writeFileSync(ap, at);
console.log("ANALYZER_PRACTICE_ADDED");