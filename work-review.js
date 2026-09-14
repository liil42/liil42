const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/server/src/learning-store.js";
let t = fs.readFileSync(p, "utf8");
const before = t;

// 1. 表结构新增复习调度字段
t = t.replace(
`    CREATE INDEX IF NOT EXISTS idx_mistake_items_user
      ON mistake_items(user_id, status, updated_at DESC);`,
`    CREATE INDEX IF NOT EXISTS idx_mistake_items_user
      ON mistake_items(user_id, status, updated_at DESC);`
);

// 2. 迁移：为老表补字段
t = t.replace(
`  const sessionColumns = db.prepare('PRAGMA table_info(learning_sessions)').all();`,
`  const mistakeColumns = db.prepare('PRAGMA table_info(mistake_items)').all();
  const mistakeColumnNames = mistakeColumns.map((column) => column.name);
  if (!mistakeColumnNames.includes('last_reviewed_at')) {
    db.exec('ALTER TABLE mistake_items ADD COLUMN last_reviewed_at TEXT');
  }
  if (!mistakeColumnNames.includes('next_review_at')) {
    db.exec('ALTER TABLE mistake_items ADD COLUMN next_review_at TEXT');
  }
  if (!mistakeColumnNames.includes('correct_streak')) {
    db.exec('ALTER TABLE mistake_items ADD COLUMN correct_streak INTEGER NOT NULL DEFAULT 0');
  }
  if (!mistakeColumnNames.includes('wrong_streak')) {
    db.exec('ALTER TABLE mistake_items ADD COLUMN wrong_streak INTEGER NOT NULL DEFAULT 0');
  }

  const sessionColumns = db.prepare('PRAGMA table_info(learning_sessions)').all();`
);

// 3. mapMistake 补充新字段
t = t.replace(
`    reviewCount: row.review_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at
  };
}`,
`    reviewCount: row.review_count,
    correctStreak: row.correct_streak || 0,
    wrongStreak: row.wrong_streak || 0,
    lastReviewedAt: row.last_reviewed_at || null,
    nextReviewAt: row.next_review_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at
  };
}`
);

// 4. 复习间隔算法 + 记录复习结果
t = t.replace(
`  function reviewMistake(userId, id) {`,
`  function scheduleNextReview(correctStreak) {
    if (correctStreak >= 4) return null;
    const days = correctStreak <= 1 ? 1 : correctStreak === 2 ? 3 : 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  function applyReviewResult(userId, id, correct) {
    const existing = db.prepare('SELECT * FROM mistake_items WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) return null;
    const now = new Date().toISOString();
    const correctStreak = correct ? (existing.correct_streak || 0) + 1 : 0;
    const wrongStreak = correct ? 0 : (existing.wrong_streak || 0) + 1;
    const mastered = correctStreak >= 4;
    const nextReviewAt = mastered ? null : scheduleNextReview(correctStreak);
    const status = mastered ? 'resolved' : 'reviewing';
    db.prepare(\`
      UPDATE mistake_items
      SET status = ?, review_count = review_count + 1,
          correct_streak = ?, wrong_streak = ?,
          last_reviewed_at = ?, next_review_at = ?,
          resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE NULL END,
          updated_at = ?
      WHERE id = ? AND user_id = ?
    \`).run(
      status, correctStreak, wrongStreak, now, nextReviewAt,
      status, now, now, id, userId
    );
    return mapMistake(db.prepare('SELECT * FROM mistake_items WHERE id = ?').get(id));
  }

  function listDueMistakes(userId) {
    const now = new Date().toISOString();
    return db.prepare(\`
      SELECT * FROM mistake_items
      WHERE user_id = ? AND status != 'resolved'
        AND (next_review_at IS NULL OR next_review_at <= ?)
      ORDER BY COALESCE(next_review_at, created_at) ASC
    \`).all(userId, now).map(mapMistake);
  }

  function countDueMistakes(userId) {
    const now = new Date().toISOString();
    const row = db.prepare(\`
      SELECT COUNT(*) AS total FROM mistake_items
      WHERE user_id = ? AND status != 'resolved'
        AND (next_review_at IS NULL OR next_review_at <= ?)
    \`).get(userId, now);
    return row ? row.total : 0;
  }

  function reviewMistake(userId, id) {`
);

// 5. 导出新方法
t = t.replace(
`    reviewMistake,`,
`    reviewMistake,
    applyReviewResult,
    listDueMistakes,
    countDueMistakes,`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("REVIEW_SYSTEM_ADDED");