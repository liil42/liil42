const base = "http://127.0.0.1:3002";
const out = [];
function log(name, ok, extra) { out.push((ok ? "PASS " : "FAIL ") + name + (extra ? " :: " + extra : "")); }
async function call(path, options = {}, token) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}) };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(base + path, { ...options, headers });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  return { status: res.status, data };
}
(async () => {
  const name = "e2e" + Date.now().toString().slice(-7);
  const pass = "test123456";

  const reg = await call("/api/auth/register", { method: "POST", body: JSON.stringify({ username: name, password: pass }) });
  log("1 注册", reg.status === 200, "status=" + reg.status);
  const token = reg.data && reg.data.token;
  if (!token) { console.log(out.join("\n")); return; }

  const key = await call("/api/settings/apikey", { method: "POST", body: JSON.stringify({ provider: "deepseek", apiKey: "sk-e2e-not-real", baseUrl: "", model: "deepseek-chat" }) }, token);
  log("2 保存 API Key", key.status === 200, "status=" + key.status);

  const lines = ["const total = price * count;", "if (total > 100) {", "  console.log(total);", "}"];
  const code = lines.join("\n");
  const mockAnalysis = {
    file: "demo.js",
    language: "javascript",
    explanation: "这段代码用于计算总价并根据条件输出结果。",
    confidence: "高",
    risk_level: "低",
    risk_reason: "无",
    tokens: [{ text: "const", meaning: "声明一个不会重新赋值的变量" }],
    must_know: ["const 声明的变量不能重新赋值"]
  };

  const sessionCreate = await call("/api/analyze/snippet", { method: "POST", body: JSON.stringify({ code, language: "javascript", style: "" }) }, token);
  const message = (sessionCreate.data && sessionCreate.data.message) || "";
  const chineseError = /[\u4e00-\u9fa5]/.test(message);
  log("3 分析接口返回中文提示（未配置真实 AI Key）",
    [200, 400, 502].includes(sessionCreate.status) && (sessionCreate.status === 200 || chineseError),
    "status=" + sessionCreate.status + " msg=" + message.slice(0, 40));

  // 用测试库直接建学习会话，验证后续链路
  const { createLearningStore } = require("F:/AI-codex/daimaxuexi/server/src/learning-store.js");
  const store = createLearningStore("F:/AI-codex/daimaxuexi/server/data/e2e-test-learnings.db");
  const session = store.createSession({
    userId: "e2e-user",
    sourceType: "snippet",
    fileName: "demo.js",
    language: "javascript",
    code,
    analysis: mockAnalysis
  });
  log("4 创建学习会话", Boolean(session && session.id), "id=" + (session && session.id ? session.id.slice(0, 8) : ""));

  const category = store.createCategory({ userId: "e2e-user", name: "重点项目", color: "#38bdf8" });
  log("5 新建自定义分类", Boolean(category && category.id), "name=" + (category && category.name));

  const assigned = store.assignSessionCategory("e2e-user", session.id, category.id);
  log("6 会话归类", Boolean(assigned), "category=" + (assigned && assigned.categoryName));

  const insight = store.upsertInsight({
    userId: "e2e-user",
    sessionId: session.id,
    lineNumber: 1,
    lineText: lines[0],
    insight: {
      plain_explanation: "先算出总价，把结果存进 total。",
      analogy: "就像先把商品总价算好，再写在小票上。",
      tokens: [{ text: "const", meaning: "声明变量" }],
      execution_before: "price 和 count 已经有值",
      execution_after: "total 得到结果",
      why_here: "后面要用到总价",
      if_wrong: "变量名写错就会报错",
      must_know: ["乘法从左到右计算"]
    }
  });
  log("7 保存逐行讲解", Boolean(insight), "line=" + (insight && insight.lineNumber));

  const question = store.addQuestion({ userId: "e2e-user", sessionId: session.id, lineNumber: 1, question: "price 是从哪来的？", answer: { answer: "它来自上面的变量定义。" } });
  log("8 保存行提问", Boolean(question && question.id));

  const understanding = store.addUnderstanding({
    userId: "e2e-user",
    sessionId: session.id,
    lineNumber: 1,
    content: "把价格乘数量存进 total。",
    feedback: { correct_parts: ["抓住了乘法"], missing_parts: ["没提到变量保存"], encouragement: "方向对的", standard_explanation: "先算乘法，再存进 total。" },
    status: "partly_understood"
  });
  log("9 保存自己的理解", Boolean(understanding && understanding.id), "version=" + (understanding && understanding.version));

  const practice = store.addPractice({
    userId: "e2e-user",
    sessionId: session.id,
    lineNumber: 1,
    practiceType: "restate",
    userAnswer: "算总价",
    feedback: { correct: true, encouragement: "很好", standard_explanation: "把价格和数量相乘后保存。" },
    result: "correct"
  });
  log("10 保存小练习记录", Boolean(practice && practice.id));

  const practiceList = store.listPractice("e2e-user", session.id);
  log("11 读取小练习记录", practiceList.length === 1, "count=" + practiceList.length);

  const mistake = store.addMistake({
    userId: "e2e-user",
    sessionId: session.id,
    categoryId: category.id,
    itemType: "line",
    startLine: 1,
    endLine: 1,
    title: "第 1 行",
    codeSnippet: lines[0],
    question: "这一行怎么算的？",
    note: "复习乘法顺序"
  });
  log("12 加入错题库", Boolean(mistake && mistake.id), "status=" + (mistake && mistake.status));

  const due1 = store.countDueMistakes("e2e-user");
  log("13 今日待复习计数", due1 === 1, "count=" + due1);

  const r1 = store.applyReviewResult("e2e-user", mistake.id, true);
  log("14 复习答对一次", r1.correctStreak === 1 && r1.nextReviewAt !== null, "连对=" + r1.correctStreak + " 状态=" + r1.status);

  const r2 = store.applyReviewResult("e2e-user", mistake.id, false);
  log("15 复习答错重置", r2.correctStreak === 0 && r2.wrongStreak === 1, "连对=" + r2.correctStreak + " 连错=" + r2.wrongStreak);

  let mastered = null;
  for (let i = 0; i < 4; i += 1) mastered = store.applyReviewResult("e2e-user", mistake.id, true);
  log("16 连对四次标记已掌握", mastered.status === "resolved" && mastered.correctStreak === 4, "状态=" + mastered.status + " 连对=" + mastered.correctStreak);

  const history = store.listSessionSummaries("e2e-user");
  log("17 历史记录可读", history.length >= 1, "count=" + history.length);

  const loaded = store.getSession("e2e-user", session.id);
  log("18 历史可重新进入学习现场", Boolean(loaded && loaded.code === code));

  const filtered = store.listMistakes("e2e-user", { status: "resolved" });
  log("19 错题库状态筛选", filtered.length === 1, "count=" + filtered.length);

  const deleted = store.deleteMistake("e2e-user", mistake.id);
  log("20 删除错题", deleted === true);

  store.deleteUserData("e2e-user");
  store.close();

  const del = await call("/api/me/account", { method: "DELETE", body: JSON.stringify({ password: pass }) }, token);
  log("21 注销账号", del.status === 200, "status=" + del.status);

  const reReg = await call("/api/auth/register", { method: "POST", body: JSON.stringify({ username: name, password: pass }) });
  log("22 注销后用户名可重新注册", reReg.status === 200, "status=" + reReg.status);

  console.log(out.join("\n"));
  const failed = out.filter((line) => line.startsWith("FAIL")).length;
  console.log("\n合计 " + out.length + " 项，失败 " + failed + " 项");
})();