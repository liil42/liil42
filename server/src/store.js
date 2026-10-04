const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { decrypt } = require('./crypto');

const sqlite = db.sqlite;

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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

function createUser(username, password) {
  const user = {
    id: crypto.randomUUID(),
    username,
    password_hash: bcrypt.hashSync(password, 10),
    is_member: 0,
    created_at: new Date().toISOString()
  };
  sqlite.prepare('INSERT INTO users (id, username, password_hash, is_member, created_at) VALUES (?, ?, ?, ?, ?)').run(
    user.id, user.username, user.password_hash, user.is_member, user.created_at
  );
  return getUserById(user.id);
}

function findUserByUsername(username) {
  return mapUser(sqlite.prepare('SELECT * FROM users WHERE username = ?').get(username));
}

function getUserById(id) {
  return mapUser(sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id));
}

function isUserMember(userId) {
  const user = getUserById(userId);
  return Boolean(user && user.is_member);
}

function activateMembership(userId) {
  sqlite.prepare('UPDATE users SET is_member = 1 WHERE id = ?').run(userId);
  return getUserById(userId);
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.password_hash);
}

function saveApiKey(userId, provider, encryptedKey, baseUrl, model) {
  sqlite.prepare(`
    INSERT INTO api_keys (user_id, provider, key_encrypted, base_url, model, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      provider = excluded.provider,
      key_encrypted = excluded.key_encrypted,
      base_url = excluded.base_url,
      model = excluded.model,
      updated_at = excluded.updated_at
  `).run(userId, provider, encryptedKey, baseUrl || null, model || null, new Date().toISOString());
}

function decryptStoredKey(encryptedKey) {
  try {
    return { key: decrypt(encryptedKey), invalid: false, error: null };
  } catch (error) {
    return { key: '', invalid: true, error, errorMessage: String((error && error.message) || error) };
  }
}

function getApiKeyRecord(userId, options = {}) {
  const row = sqlite.prepare('SELECT * FROM api_keys WHERE user_id = ?').get(userId);
  if (!row) return null;
  const decoded = decryptStoredKey(row.key_encrypted);
  if (decoded.invalid && !options.allowInvalid) {
    const error = new Error('已保存的 API Key 无法读取，请在设置中重新填写 API Key');
    error.status = 400;
    error.code = 'API_KEY_INVALID';
    throw error;
  }
  return {
    provider: row.provider,
    key: decoded.key,
    baseUrl: row.base_url,
    model: row.model,
    invalid: decoded.invalid,
    errorMessage: decoded.errorMessage || ''
  };
}

function createMembershipCodes(count = 1) {
  const createdAt = new Date().toISOString();
  const codes = [];
  const insert = sqlite.prepare('INSERT INTO membership_codes (id, code, used_by, used_at, created_at) VALUES (?, ?, NULL, NULL, ?)');
  for (let i = 0; i < count; i += 1) {
    const part = () => crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `CM-${part()}-${part()}`;
    insert.run(crypto.randomUUID(), code, createdAt);
    codes.push(code);
  }
  return codes;
}

function redeemMembership(userId, code) {
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    const row = sqlite.prepare('SELECT * FROM membership_codes WHERE code = ?').get(code);
    if (!row) {
      sqlite.exec('ROLLBACK');
      return { ok: false, message: '激活码不存在' };
    }
    if (row.used_by) {
      sqlite.exec('ROLLBACK');
      return { ok: false, message: '激活码已经使用过了' };
    }
    const now = new Date().toISOString();
    sqlite.prepare('UPDATE membership_codes SET used_by = ?, used_at = ? WHERE code = ?').run(userId, now, code);
    sqlite.prepare('UPDATE users SET is_member = 1 WHERE id = ?').run(userId);
    sqlite.exec('COMMIT');
    return { ok: true, user: getUserById(userId) };
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

function todayRunCount(userId) {
  const row = sqlite.prepare(`SELECT COUNT(*) AS total FROM analysis_runs WHERE user_id = ? AND source_type != 'quota_placeholder' AND substr(created_at, 1, 10) = ?`).get(userId, localDateKey());
  return row ? row.total : 0;
}

function claimDailyQuota(userId, limit = 3) {
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    const row = sqlite.prepare(`
      SELECT COUNT(*) AS total FROM analysis_runs
      WHERE user_id = ? AND source_type = 'quota_placeholder' AND substr(created_at, 1, 10) = ?
    `).get(userId, localDateKey());
    const used = row ? row.total : 0;
    if (used >= limit) {
      sqlite.exec('COMMIT');
      return { allowed: false, used };
    }
    sqlite.prepare(`
      INSERT INTO analysis_runs (id, user_id, source_type, file_name, result_json, created_at)
      VALUES (?, ?, 'quota_placeholder', '配额占位', '{}', ?)
    `).run(crypto.randomUUID(), userId, new Date().toISOString());
    sqlite.exec('COMMIT');
    return { allowed: true, used: used + 1 };
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

function refundDailyQuota(userId) {
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    const row = sqlite.prepare(`
      SELECT id FROM analysis_runs
      WHERE user_id = ? AND source_type = 'quota_placeholder' AND substr(created_at, 1, 10) = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(userId, localDateKey());
    if (!row) {
      sqlite.exec('COMMIT');
      return { refunded: false };
    }
    sqlite.prepare('DELETE FROM analysis_runs WHERE id = ?').run(row.id);
    sqlite.exec('COMMIT');
    return { refunded: true };
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

function recordRun(userId, runType, title, result) {
  const now = new Date();
  const id = crypto.randomUUID();
  sqlite.prepare(`
    INSERT INTO analysis_runs (id, user_id, source_type, file_name, result_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, runType, title, JSON.stringify(result || {}), now.toISOString());
  return id;
}

function listHistory(userId) {
  return sqlite.prepare(`
    SELECT id, source_type AS run_type, file_name AS title, result_json, created_at
    FROM analysis_runs WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 30
  `).all(userId).map((row) => ({
    id: row.id,
    run_type: row.run_type,
    title: row.title,
    created_at: row.created_at,
    summary: String(row.result_json || '').slice(0, 120)
  }));
}

function getHistoryItem(userId, id) {
  const row = sqlite.prepare('SELECT * FROM analysis_runs WHERE user_id = ? AND id = ?').get(userId, id);
  if (!row) return null;
  return {
    id: row.id,
    run_type: row.source_type,
    title: row.file_name,
    result: row.result_json,
    created_at: row.created_at
  };
}

function deleteHistoryItem(userId, id) {
  const result = sqlite.prepare('DELETE FROM analysis_runs WHERE user_id = ? AND id = ?').run(userId, id);
  if (result.changes === 0) {
    const error = new Error('记录不存在或已被删除');
    error.status = 404;
    error.code = 'HISTORY_ITEM_NOT_FOUND';
    throw error;
  }
  return true;
}

function clearUserData(userId) {
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    const { learningStore } = require('./learning-store');
    learningStore.clearUserData(userId, { skipTransaction: true });
    // 空数据属于合法业务场景：changes 为 0 时不抛异常
    const removedRuns = sqlite.prepare('DELETE FROM analysis_runs WHERE user_id = ?').run(userId).changes;
    const releasedCodes = sqlite.prepare('UPDATE membership_codes SET used_by = NULL, used_at = NULL WHERE used_by = ?').run(userId).changes;
    sqlite.exec('COMMIT');
    return { removedRuns: Number(removedRuns) || 0, releasedCodes: Number(releasedCodes) || 0 };
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

function assertUserExists(userId) {
  const row = sqlite.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!row) {
    const error = new Error('账号不存在或已注销');
    error.status = 404;
    error.code = 'ACCOUNT_NOT_FOUND';
    throw error;
  }
  return row;
}

function deleteUserData(userId) {
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    assertUserExists(userId);
    const deletedUser = sqlite.prepare('DELETE FROM users WHERE id = ?').run(userId);
    if (!deletedUser.changes) {
      const error = new Error('账号删除失败，未匹配到任何账号');
      error.status = 404;
      error.code = 'ACCOUNT_DELETE_FAILED';
      throw error;
    }
    sqlite.prepare('DELETE FROM analysis_runs WHERE user_id = ?').run(userId);
    sqlite.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
    sqlite.prepare('UPDATE membership_codes SET used_by = NULL, used_at = NULL WHERE used_by = ?').run(userId);
    const { learningStore } = require('./learning-store');
    learningStore.clearUserData(userId, { skipTransaction: true });
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}

module.exports = {
  createUser,
  findUserByUsername,
  getUserById,
  isUserMember,
  activateMembership,
  verifyPassword,
  saveApiKey,
  getApiKeyRecord,
  createMembershipCodes,
  redeemMembership,
  todayRunCount,
  recordRun,
  claimDailyQuota,
  refundDailyQuota,
  listHistory,
  getHistoryItem,
  deleteHistoryItem,
  clearUserData,
  deleteUserData
};
