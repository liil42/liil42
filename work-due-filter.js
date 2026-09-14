const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/server/src/index.js";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`    const mistakes = learningStore.listMistakes(req.user.id, {
      status: req.query.status || '',
      categoryId: req.query.categoryId || '',
      itemType: req.query.itemType || ''
    });
    return res.json({ mistakes });`,
`    const status = String(req.query.status || '');
    if (status === 'due') {
      return res.json({ mistakes: learningStore.listDueMistakes(req.user.id) });
    }
    const mistakes = learningStore.listMistakes(req.user.id, {
      status,
      categoryId: req.query.categoryId || '',
      itemType: req.query.itemType || ''
    });
    return res.json({ mistakes });`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("DUE_FILTER_ADDED");