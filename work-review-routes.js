const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/server/src/index.js";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`app.post('/api/learning/sessions/:id/lines/:lineNumber/practice', requireAuth, async (req, res, next) => {`,
`app.post('/api/mistakes/:id/review-result', requireAuth, (req, res, next) => {
  try {
    const correct = Boolean(req.body?.correct);
    const record = learningStore.applyReviewResult(req.user.id, req.params.id, correct);
    if (!record) return res.status(404).json({ message: '错题不存在' });
    return res.json({ mistake: record, dueCount: learningStore.countDueMistakes(req.user.id) });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/mistakes/due/count', requireAuth, (req, res, next) => {
  try {
    return res.json({
      count: learningStore.countDueMistakes(req.user.id),
      due: learningStore.listDueMistakes(req.user.id)
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/learning/sessions/:id/lines/:lineNumber/practice', requireAuth, async (req, res, next) => {`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("REVIEW_ROUTES_ADDED");