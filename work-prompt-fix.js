const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/server/src/prompts.js";
let t = fs.readFileSync(p, "utf8");
const before = t;

// 移除位置错误的导出块
t = t.replace(
`module.exports = {
  SYSTEM_PROMPT,
  snippetMessages,
  projectMapMessages,
  projectDeepMessages,
  errorMessages,
  urlMessages,
  annotateMessages,
  lineInsightMessages,
  lineQuestionMessages,
  understandingReviewMessages
};


`,
``
);

// 强化 understandingReviewMessages 语气要求
t = t.replace(
`要求：
1. 先指出理解正确的部分，不能只批评。
2. 指出遗漏的关键步骤和因果关系。
3. 明确指出错误理解，并解释为什么错。
4. 不要直接替用户重写全部答案，先给一个引导性追问。
5. 最后给出一版小白能看懂的标准解释。
6. 只输出严格 JSON，不要输出 JSON 以外的内容。`,
`要求：
1. 先用一句话肯定用户已经理解对的地方，语气要具体，不要空泛夸奖。
2. 一次最多指出两个主要问题，优先说最关键的那个。
3. 指出遗漏的关键步骤和因果关系，可以用生活里的比喻。
4. 说明错误理解时要说"这里可以再补一句"，避免生硬否定。
5. 不要直接替用户重写全部答案，先给一个引导性追问。
6. 最后给出一版小白能看懂的标准解释，比用户的原话更简单。
7. 只输出严格 JSON，不要输出 JSON 以外的内容。`
);

// 统一加强 practiceReviewMessages 的语气
t = t.replace(
`        '请始终先肯定学员理解正确的地方，再补充需要完善的地方，语气温暖、口语化。',`,
`        '请始终先肯定学员理解正确的地方，再补充需要完善的地方，语气温暖、口语化。',`
);

// 末尾统一导出
t = t.trimEnd() + `

module.exports = {
  SYSTEM_PROMPT,
  snippetMessages,
  projectMapMessages,
  projectDeepMessages,
  errorMessages,
  urlMessages,
  annotateMessages,
  lineInsightMessages,
  lineQuestionMessages,
  understandingReviewMessages,
  practiceReviewMessages
};
`;

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("PROMPT_EXPORT_FIXED");