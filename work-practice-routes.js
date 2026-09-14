const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/server/src/index.js";
let t = fs.readFileSync(p, "utf8");
const before = t;

// 引入 reviewPractice
t = t.replace(
`  reviewUnderstanding,
  totalLines
} = require('./analyzer');`,
`  reviewUnderstanding,
  reviewPractice,
  totalLines
} = require('./analyzer');`
);

// 新增练习接口，插在 project 分析之前
t = t.replace(
`app.post('/api/analyze/project', requireAuth, async (req, res, next) => {`,
`app.post('/api/learning/sessions/:id/lines/:lineNumber/practice', requireAuth, async (req, res, next) => {
  try {
    const session = learningStore.getSessionForLearning(req.user.id, req.params.id);
    if (!session) return res.status(404).json({ message: '学习记录不存在' });

    const lineNumber = Number.parseInt(req.params.lineNumber, 10);
    const lines = String(session.code || '').split(/\\r?\\n/);
    if (!Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > lines.length) {
      return res.status(400).json({ message: '行号超出代码范围' });
    }

    const practiceType = String(req.body?.practiceType || 'restate');
    const question = String(req.body?.question || '').trim();
    const userAnswer = String(req.body?.userAnswer || '').trim();
    if (!userAnswer) return res.status(400).json({ message: '请先写下你的答案' });
    if (userAnswer.length > 4000) return res.status(400).json({ message: '答案不能超过 4000 字' });

    const keyRecord = requireApiKey(req);
    const insight = learningStore.getInsight(req.user.id, session.id, lineNumber);
    const feedback = await reviewPractice(keyRecord, {
      code: session.code,
      language: session.language,
      lineNumber,
      lineText: lines[lineNumber - 1] || '',
      practiceType,
      question,
      userAnswer,
      insight: insight?.insight || {}
    });

    const record = learningStore.addPractice({
      userId: req.user.id,
      sessionId: session.id,
      lineNumber,
      practiceType,
      userAnswer,
      feedback,
      result: feedback.correct ? 'correct' : 'needs_revision'
    });

    return res.json({ practice: record, feedback });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/learning/sessions/:id/practice', requireAuth, (req, res, next) => {
  try {
    const session = learningStore.getSession(req.user.id, req.params.id);
    if (!session) return res.status(404).json({ message: '学习记录不存在' });
    return res.json({ practice: learningStore.listPractice(req.user.id, session.id) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/analyze/project', requireAuth, async (req, res, next) => {`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("ROUTES_ADDED practice=" + (t.match(/practice/g) || []).length);