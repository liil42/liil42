const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/server/src/learning-store.js";
let t = fs.readFileSync(p, "utf8");
const before = t;

// 1. 新增练习记录表
t = t.replace(
`    CREATE INDEX IF NOT EXISTS idx_mistake_items_user
      ON mistake_items(user_id, status, updated_at DESC);`,
`    CREATE INDEX IF NOT EXISTS idx_mistake_items_user
      ON mistake_items(user_id, status, updated_at DESC);

    CREATE TABLE IF NOT EXISTS practice_records (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      practice_type TEXT NOT NULL,
      user_answer TEXT NOT NULL,
      feedback_json TEXT NOT NULL,
      result TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_practice_records_user
      ON practice_records(user_id, session_id, line_number, created_at DESC);`
);

// 2. 映射函数
t = t.replace(
`function mapInsight(row) {`,
`function mapPractice(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    lineNumber: row.line_number,
    practiceType: row.practice_type,
    userAnswer: row.user_answer,
    feedback: parseJson(row.feedback_json, {}),
    result: row.result,
    createdAt: row.created_at
  };
}

function mapInsight(row) {`
);

// 3. 存储方法：新增练习
t = t.replace(
`  function addMistake({`,
`  function addPractice({ userId, sessionId, lineNumber, practiceType, userAnswer, feedback, result }) {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(\`
      INSERT INTO practice_records (
        id, session_id, user_id, line_number, practice_type,
        user_answer, feedback_json, result, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).run(
      id,
      sessionId,
      userId,
      lineNumber,
      practiceType || 'restate',
      userAnswer,
      JSON.stringify(feedback || {}),
      result || 'unknown',
      now
    );
    return mapPractice(db.prepare('SELECT * FROM practice_records WHERE id = ?').get(id));
  }

  function listPractice(userId, sessionId) {
    return db.prepare(\`
      SELECT * FROM practice_records
      WHERE user_id = ? AND session_id = ?
      ORDER BY created_at DESC
    \`).all(userId, sessionId).map(mapPractice);
  }

  function addMistake({`
);

// 4. 从 session 详情中带出练习记录
t = t.replace(
`  function getSession(userId, id) {`,
`  function getSessionWithPractice(userId, id) {
    const session = getSession(userId, id);
    if (!session) return null;
    return { ...session, practice: listPractice(userId, id) };
  }

  function getSession(userId, id) {`
);

// 5. 导出
t = t.replace(
`    addUnderstanding,`,
`    addUnderstanding,
    addPractice,
    listPractice,
    getSessionWithPractice,`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("STORE_PRACTICE_ADDED practice=" + (t.match(/practice_records/g) || []).length);