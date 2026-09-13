const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
const defaultDatabasePath = process.env.LEARNING_DB_PATH || path.join(dataDir, 'learning.db');

function ensureDatabaseDirectory(databasePath) {
  if (databasePath === ':memory:') return;
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

function parseJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function initializeSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS learning_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      analysis_run_id TEXT,
      source_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      language TEXT,
      code TEXT NOT NULL,
      analysis_json TEXT NOT NULL,
      category_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_learning_sessions_user
      ON learning_sessions(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS learning_categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#38bdf8',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS line_insights (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      line_text TEXT NOT NULL,
      insight_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(session_id, line_number),
      FOREIGN KEY(session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS line_questions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      insight_id TEXT,
      user_id TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(insight_id) REFERENCES line_insights(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_line_questions_session
      ON line_questions(session_id, line_number, created_at);

    CREATE TABLE IF NOT EXISTS understanding_records (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      line_number INTEGER NOT NULL,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      feedback_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE,
      UNIQUE(session_id, line_number, version)
    );

    CREATE INDEX IF NOT EXISTS idx_understanding_records_session
      ON understanding_records(session_id, line_number, version DESC);

    CREATE TABLE IF NOT EXISTS mistake_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      category_id TEXT,
      item_type TEXT NOT NULL CHECK (item_type IN ('line', 'function')),
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      title TEXT NOT NULL,
      code_snippet TEXT NOT NULL,
      question TEXT NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'unresolved',
      review_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY(session_id) REFERENCES learning_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY(category_id) REFERENCES learning_categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mistake_items_user
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
      ON practice_records(user_id, session_id, line_number, created_at DESC);


      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_cents INTEGER NOT NULL,
        duration_days INTEGER,
        description TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_no TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        plan_id TEXT,
        amount_cents INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        pay_type TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_orders_user
        ON orders(user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS memberships (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_id TEXT,
        source_order_id TEXT,
        start_at TEXT NOT NULL,
        expire_at TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memberships_user
        ON memberships(user_id, status);

  `);
  const mistakeColumns = db.prepare('PRAGMA table_info(mistake_items)').all();
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

  const sessionColumns = db.prepare('PRAGMA table_info(learning_sessions)').all();
  if (!sessionColumns.some((column) => column.name === 'category_id')) {
    db.exec('ALTER TABLE learning_sessions ADD COLUMN category_id TEXT');
  }
}

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    analysisRunId: row.analysis_run_id,
    sourceType: row.source_type,
    fileName: row.file_name,
    language: row.language,
    code: row.code,
    analysis: parseJson(row.analysis_json, {}),
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPractice(row) {
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

function mapInsight(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    lineNumber: row.line_number,
    lineText: row.line_text,
    insight: parseJson(row.insight_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapQuestion(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    insightId: row.insight_id,
    lineNumber: row.line_number,
    question: row.question,
    answer: parseJson(row.answer_json, {}),
    createdAt: row.created_at
  };
}

function mapUnderstanding(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    lineNumber: row.line_number,
    version: row.version,
    content: row.content,
    feedback: parseJson(row.feedback_json, {}),
    status: row.status,
    createdAt: row.created_at
  };
}

function mapMistake(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    categoryId: row.category_id,
    itemType: row.item_type,
    startLine: row.start_line,
    endLine: row.end_line,
    title: row.title,
    codeSnippet: row.code_snippet,
    question: row.question,
    note: row.note,
    status: row.status,
    reviewCount: row.review_count,
    correctStreak: row.correct_streak || 0,
    wrongStreak: row.wrong_streak || 0,
    lastReviewedAt: row.last_reviewed_at || null,
    nextReviewAt: row.next_review_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at
  };
}

function createLearningStore(databasePath = defaultDatabasePath) {
  ensureDatabaseDirectory(databasePath);
  const db = new DatabaseSync(databasePath);
  initializeSchema(db);

  function createSession({ userId, analysisRunId, sourceType, fileName, language, code, analysis, categoryId }) {
    const now = new Date().toISOString();
    const id = randomUUID();
    db.prepare(`
      INSERT INTO learning_sessions (
        id, user_id, analysis_run_id, source_type, file_name, language,
        code, analysis_json, category_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      analysisRunId || null,
      sourceType || 'snippet',
      fileName || '粘贴代码',
      language || '',
      code,
      JSON.stringify(analysis || {}),
      categoryId || null,
      now,
      now
    );
    return mapSession(db.prepare(`
      SELECT s.*, c.name AS category_name
      FROM learning_sessions s
      LEFT JOIN learning_categories c ON c.id = s.category_id
      WHERE s.id = ?
    `).get(id));
  }

  function getSession(userId, sessionId) {
    const session = db.prepare(`
      SELECT s.*, c.name AS category_name
      FROM learning_sessions s
      LEFT JOIN learning_categories c ON c.id = s.category_id
      WHERE s.id = ? AND s.user_id = ?
    `).get(sessionId, userId);
    if (!session) return null;

    const insights = db.prepare(`
      SELECT * FROM line_insights
      WHERE session_id = ?
      ORDER BY line_number
    `).all(sessionId).map(mapInsight);
    const questions = db.prepare(`
      SELECT * FROM line_questions
      WHERE session_id = ?
      ORDER BY created_at
    `).all(sessionId).map(mapQuestion);
    const understandings = db.prepare(`
      SELECT * FROM understanding_records
      WHERE session_id = ?
      ORDER BY line_number, version
    `).all(sessionId).map(mapUnderstanding);

    return {
      ...mapSession(session),
      insights,
      questions,
      understandings
    };
  }

  function listSessionSummaries(userId) {
    return db.prepare(`
      SELECT s.id, s.analysis_run_id, s.category_id, s.file_name,
             s.created_at, s.updated_at, c.name AS category_name
      FROM learning_sessions s
      LEFT JOIN learning_categories c ON c.id = s.category_id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `).all(userId).map((row) => ({
      id: row.id,
      analysisRunId: row.analysis_run_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      fileName: row.file_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  function listCategories(userId) {
    return db.prepare(`
      SELECT * FROM learning_categories
      WHERE user_id = ?
      ORDER BY created_at
    `).all(userId).map(mapCategory);
  }

  function createCategory(userId, name, color) {
    if (typeof userId === 'object' && userId !== null) {
      const payload = userId;
      return createCategory(payload.userId, payload.name, payload.color);
    }
    const now = new Date().toISOString();
    const id = randomUUID();
    db.prepare(`
      INSERT INTO learning_categories (id, user_id, name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, name, color || '#38bdf8', now, now);
    return mapCategory(db.prepare('SELECT * FROM learning_categories WHERE id = ?').get(id));
  }

  function updateCategory(userId, id, { name, color }) {
    const existing = db.prepare(`
      SELECT * FROM learning_categories WHERE id = ? AND user_id = ?
    `).get(id, userId);
    if (!existing) return null;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE learning_categories
      SET name = ?, color = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(name || existing.name, color || existing.color, now, id, userId);
    return mapCategory(db.prepare('SELECT * FROM learning_categories WHERE id = ?').get(id));
  }

  function deleteCategory(userId, id) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const existing = db.prepare(`
        SELECT id FROM learning_categories WHERE id = ? AND user_id = ?
      `).get(id, userId);
      if (!existing) {
        db.exec('ROLLBACK');
        return false;
      }

      db.prepare(`
        UPDATE learning_sessions
        SET category_id = NULL, updated_at = ?
        WHERE category_id = ? AND user_id = ?
      `).run(new Date().toISOString(), id, userId);
      db.prepare(`
        UPDATE mistake_items
        SET category_id = NULL, updated_at = ?
        WHERE category_id = ? AND user_id = ?
      `).run(new Date().toISOString(), id, userId);
      db.prepare(`
        DELETE FROM learning_categories WHERE id = ? AND user_id = ?
      `).run(id, userId);
      db.exec('COMMIT');
      return true;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function assignSessionCategory(userId, sessionId, categoryId) {
    if (categoryId) {
      const category = db.prepare(`
        SELECT id FROM learning_categories WHERE id = ? AND user_id = ?
      `).get(categoryId, userId);
      if (!category) return null;
    }
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE learning_sessions
      SET category_id = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(categoryId || null, now, sessionId, userId);
    if (result.changes === 0) return null;
    return getSession(userId, sessionId);
  }

  function getSessionWithPractice(userId, id) {
    const session = getSession(userId, id);
    if (!session) return null;
    return { ...session, practice: listPractice(userId, id) };
  }

  function getSessionForLearning(userId, sessionId) {
    return db.prepare(`
      SELECT * FROM learning_sessions
      WHERE id = ? AND user_id = ?
    `).get(sessionId, userId) || null;
  }

  function getInsight(userId, sessionId, lineNumber) {
    return mapInsight(db.prepare(`
      SELECT * FROM line_insights
      WHERE session_id = ? AND user_id = ? AND line_number = ?
    `).get(sessionId, userId, lineNumber));
  }

  function upsertInsight({ userId, sessionId, lineNumber, lineText, insight }) {
    const now = new Date().toISOString();
    const existing = getInsight(userId, sessionId, lineNumber);
    if (existing) {
      db.prepare(`
        UPDATE line_insights
        SET line_text = ?, insight_json = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(lineText, JSON.stringify(insight || {}), now, existing.id, userId);
      return getInsight(userId, sessionId, lineNumber);
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO line_insights (
        id, session_id, user_id, line_number, line_text,
        insight_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, userId, lineNumber, lineText, JSON.stringify(insight || {}), now, now);
    return getInsight(userId, sessionId, lineNumber);
  }

  function addQuestion({ userId, sessionId, insightId, lineNumber, question, answer }) {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO line_questions (
        id, session_id, insight_id, user_id, line_number,
        question, answer_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      sessionId,
      insightId || null,
      userId,
      lineNumber,
      question,
      JSON.stringify(answer || {}),
      now
    );
    return mapQuestion(db.prepare('SELECT * FROM line_questions WHERE id = ?').get(id));
  }

  function addUnderstanding({ userId, sessionId, lineNumber, content, feedback, status }) {
    const version = db.prepare(`
      SELECT COALESCE(MAX(version), 0) + 1 AS next_version
      FROM understanding_records
      WHERE session_id = ? AND line_number = ?
    `).get(sessionId, lineNumber).next_version;
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO understanding_records (
        id, session_id, user_id, line_number, version,
        content, feedback_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      sessionId,
      userId,
      lineNumber,
      version,
      content,
      JSON.stringify(feedback || {}),
      status || 'needs_revision',
      now
    );
    return mapUnderstanding(db.prepare('SELECT * FROM understanding_records WHERE id = ?').get(id));
  }

  function addPractice({ userId, sessionId, lineNumber, practiceType, userAnswer, feedback, result }) {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO practice_records (
        id, session_id, user_id, line_number, practice_type,
        user_answer, feedback_json, result, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
    return db.prepare(`
      SELECT * FROM practice_records
      WHERE user_id = ? AND session_id = ?
      ORDER BY created_at DESC
    `).all(userId, sessionId).map(mapPractice);
  }

  function addMistake({
    userId,
    sessionId,
    categoryId,
    itemType,
    startLine,
    endLine,
    title,
    codeSnippet,
    question,
    note
  }) {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO mistake_items (
        id, user_id, session_id, category_id, item_type, start_line, end_line,
        title, code_snippet, question, note, status, review_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unresolved', 0, ?, ?)
    `).run(
      id,
      userId,
      sessionId,
      categoryId || null,
      itemType,
      startLine,
      endLine,
      title,
      codeSnippet,
      question,
      note || '',
      now,
      now
    );
    return mapMistake(db.prepare('SELECT * FROM mistake_items WHERE id = ?').get(id));
  }

  function listMistakes(userId, filters = {}) {
    const conditions = ['m.user_id = ?'];
    const params = [userId];
    if (filters.status) {
      conditions.push('m.status = ?');
      params.push(filters.status);
    }
    if (filters.categoryId) {
      conditions.push('m.category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.itemType) {
      conditions.push('m.item_type = ?');
      params.push(filters.itemType);
    }
    const rows = db.prepare(`
      SELECT m.*, c.name AS category_name, c.color AS category_color
      FROM mistake_items m
      LEFT JOIN learning_categories c ON c.id = m.category_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY CASE m.status
        WHEN 'unresolved' THEN 0
        WHEN 'reviewing' THEN 1
        ELSE 2
      END, m.updated_at DESC
    `).all(...params);
    return rows.map((row) => ({
      ...mapMistake(row),
      categoryName: row.category_name || null,
      categoryColor: row.category_color || null
    }));
  }

  function updateMistake(userId, id, updates) {
    const existing = db.prepare(`
      SELECT * FROM mistake_items WHERE id = ? AND user_id = ?
    `).get(id, userId);
    if (!existing) return null;
    const status = ['unresolved', 'reviewing', 'resolved'].includes(updates.status)
      ? updates.status
      : existing.status;
    const now = new Date().toISOString();
    const resolvedAt = status === 'resolved' ? (existing.resolved_at || now) : null;
    db.prepare(`
      UPDATE mistake_items
      SET category_id = ?, title = ?, question = ?, note = ?, status = ?,
          review_count = ?, resolved_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      Object.prototype.hasOwnProperty.call(updates, 'categoryId') ? updates.categoryId || null : existing.category_id,
      updates.title !== undefined ? updates.title : existing.title,
      updates.question !== undefined ? updates.question : existing.question,
      updates.note !== undefined ? updates.note : existing.note,
      status,
      Number.isInteger(updates.reviewCount) ? updates.reviewCount : existing.review_count,
      resolvedAt,
      now,
      id,
      userId
    );
    return mapMistake(db.prepare('SELECT * FROM mistake_items WHERE id = ?').get(id));
  }

  function scheduleNextReview(correctStreak) {
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
    db.prepare(`
      UPDATE mistake_items
      SET status = ?, review_count = review_count + 1,
          correct_streak = ?, wrong_streak = ?,
          last_reviewed_at = ?, next_review_at = ?,
          resolved_at = CASE WHEN ? = 'resolved' THEN ? ELSE NULL END,
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      status, correctStreak, wrongStreak, now, nextReviewAt,
      status, now, now, id, userId
    );
    return mapMistake(db.prepare('SELECT * FROM mistake_items WHERE id = ?').get(id));
  }

  function listDueMistakes(userId) {
    const now = new Date().toISOString();
    return db.prepare(`
      SELECT * FROM mistake_items
      WHERE user_id = ? AND status != 'resolved'
        AND (next_review_at IS NULL OR next_review_at <= ?)
      ORDER BY COALESCE(next_review_at, created_at) ASC
    `).all(userId, now).map(mapMistake);
  }

  function countDueMistakes(userId) {
    const now = new Date().toISOString();
    const row = db.prepare(`
      SELECT COUNT(*) AS total FROM mistake_items
      WHERE user_id = ? AND status != 'resolved'
        AND (next_review_at IS NULL OR next_review_at <= ?)
    `).get(userId, now);
    return row ? row.total : 0;
  }

  function reviewMistake(userId, id) {
    const existing = db.prepare(`
      SELECT * FROM mistake_items WHERE id = ? AND user_id = ?
    `).get(id, userId);
    if (!existing) return null;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE mistake_items
      SET status = CASE WHEN status = 'resolved' THEN 'reviewing' ELSE 'reviewing' END,
          review_count = review_count + 1,
          resolved_at = NULL,
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(now, id, userId);
    return mapMistake(db.prepare('SELECT * FROM mistake_items WHERE id = ?').get(id));
  }

  function deleteMistake(userId, id) {
    return db.prepare(`
      DELETE FROM mistake_items WHERE id = ? AND user_id = ?
    `).run(id, userId).changes > 0;
  }

  function deleteUserData(userId) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('DELETE FROM mistake_items WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM learning_sessions WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM learning_categories WHERE user_id = ?').run(userId);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function close() {
    db.close();
  }

  return {
    createSession,
    getSession,
    getSessionForLearning,
    listSessionSummaries,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    assignSessionCategory,
    getInsight,
    upsertInsight,
    addQuestion,
    addUnderstanding,
    addPractice,
    listPractice,
    getSessionWithPractice,
    addMistake,
    listMistakes,
    updateMistake,
    reviewMistake,
    applyReviewResult,
    listDueMistakes,
    countDueMistakes,
    deleteMistake,
    deleteUserData,
    close
  };
}

const learningStore = createLearningStore();

module.exports = {
  createLearningStore,
  learningStore
};
