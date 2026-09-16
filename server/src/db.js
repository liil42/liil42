const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
const databasePath = process.env.LEARNING_DB_PATH || path.join(dataDir, 'learning.db');
const jsonSeedFile = process.env.APP_DATA_FILE || path.join(dataDir, 'app.json');

fs.mkdirSync(dataDir, { recursive: true });
if (databasePath !== ':memory:') fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_member INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS api_keys (
    user_id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    key_encrypted TEXT NOT NULL,
    base_url TEXT,
    model TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS membership_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    used_by TEXT,
    used_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS analysis_runs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    file_name TEXT,
    result_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_analysis_runs_user ON analysis_runs(user_id, created_at DESC);
`);

function fromJson(key) {
  if (!fs.existsSync(jsonSeedFile)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(jsonSeedFile, 'utf8'));
    return Array.isArray(parsed[key]) ? parsed[key] : [];
  } catch (error) {
    return [];
  }
}

function seedFromJsonIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS total FROM users').get().total;
  if (userCount === 0) {
    const users = fromJson('users');
    const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, username, password_hash, is_member, created_at) VALUES (?, ?, ?, ?, ?)');
    for (const user of users) {
      insertUser.run(user.id, user.username, user.password_hash, user.is_member ? 1 : 0, user.created_at || new Date().toISOString());
    }
  }
  const keyCount = db.prepare('SELECT COUNT(*) AS total FROM api_keys').get().total;
  if (keyCount === 0) {
    const keys = fromJson('apiKeys');
    const insertKey = db.prepare('INSERT OR IGNORE INTO api_keys (user_id, provider, key_encrypted, base_url, model, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
    for (const key of keys) {
      insertKey.run(key.user_id, key.provider, key.key_encrypted, key.base_url || null, key.model || null, key.updated_at || new Date().toISOString());
    }
  }
  const runCount = db.prepare('SELECT COUNT(*) AS total FROM analysis_runs').get().total;
  if (runCount === 0) {
    const runs = fromJson('analysisRuns');
    const insertRun = db.prepare('INSERT OR IGNORE INTO analysis_runs (id, user_id, source_type, file_name, result_json, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    for (const run of runs) {
      insertRun.run(run.id, run.user_id, run.source_type || 'snippet', run.file_name || '', JSON.stringify(run.result || {}), run.created_at || new Date().toISOString());
    }
  }
}

seedFromJsonIfEmpty();

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    password_hash: row.password_hash,
    is_member: row.is_member,
    created_at: row.created_at
  };
}

const api = {
  get data() {
    return {
      users: db.prepare('SELECT id, username, password_hash, is_member, created_at FROM users').all().map(mapUser),
      apiKeys: db.prepare('SELECT user_id, provider, key_encrypted, base_url, model, updated_at FROM api_keys').all().map((row) => ({ ...row })),
      membershipCodes: db.prepare('SELECT * FROM membership_codes').all(),
      analysisRuns: db.prepare('SELECT id, user_id, source_type, file_name, result_json, created_at FROM analysis_runs').all().map((row) => ({ ...row, result: JSON.parse(row.result_json || '{}') }))
    };
  },
  save() {
    // SQLite writes are immediate; no full-file rewrite needed.
  },
  sqlite: db
};

module.exports = api;
