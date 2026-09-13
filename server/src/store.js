const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { decrypt } = require('./crypto');

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function createUser(username, password) {
  const user = {
    id: crypto.randomUUID(),
    username,
    password_hash: bcrypt.hashSync(password, 10),
    is_member: 0,
    created_at: new Date().toISOString()
  };
  db.data.users.push(user);
  db.save();
  return getUserById(user.id);
}

function findUserByUsername(username) {
  return db.data.users.find((user) => user.username === username) || null;
}

function getUserById(id) {
  return db.data.users.find((user) => user.id === id) || null;
}

function isUserMember(userId) {
  const user = getUserById(userId);
  return Boolean(user && user.is_member);
}

function activateMembership(userId) {
  const user = getUserById(userId);
  if (!user) return null;
  user.is_member = 1;
  db.save();
  return user;
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.password_hash);
}

function saveApiKey(userId, provider, encryptedKey, baseUrl, model) {
  const index = db.data.apiKeys.findIndex((item) => item.user_id === userId);
  const record = {
    user_id: userId,
    provider,
    key_encrypted: encryptedKey,
    base_url: baseUrl || null,
    model: model || null,
    updated_at: new Date().toISOString()
  };
  if (index >= 0) {
    db.data.apiKeys[index] = record;
  } else {
    db.data.apiKeys.push(record);
  }
  db.save();
}

function getApiKeyRecord(userId) {
  const row = db.data.apiKeys.find((item) => item.user_id === userId);
  if (!row) return null;
  return {
    provider: row.provider,
    key: decrypt(row.key_encrypted),
    baseUrl: row.base_url,
    model: row.model
  };
}

function createMembershipCodes(count = 1) {
  const createdAt = new Date().toISOString();
  const codes = [];
  for (let i = 0; i < count; i += 1) {
    const part = () => crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `CM-${part()}-${part()}`;
    db.data.membershipCodes.push({ code, used_by: null, created_at: createdAt, used_at: null });
    codes.push(code);
  }
  db.save();
  return codes;
}

function redeemMembership(userId, code) {
  const row = db.data.membershipCodes.find((item) => item.code === code);
  if (!row) return { ok: false, message: '会员码不存在' };
  if (row.used_by) return { ok: false, message: '会员码已被使用' };
  const user = getUserById(userId);
  row.used_by = userId;
  row.used_at = new Date().toISOString();
  user.is_member = 1;
  db.save();
  return { ok: true, user };
}

function todayRunCount(userId) {
  return db.data.analysisRuns.filter((item) => item.user_id === userId && item.day_key === localDateKey()).length;
}

function recordRun(userId, runType, title, result) {
  const now = new Date();
  const id = crypto.randomUUID();
  db.data.analysisRuns.push({
    id,
    user_id: userId,
    run_type: runType,
    title,
    result,
    day_key: localDateKey(now),
    created_at: now.toISOString()
  });
  db.save();
  return id;
}

function listHistory(userId) {
  return db.data.analysisRuns
    .filter((item) => item.user_id === userId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 30)
    .map((item) => ({
      id: item.id,
      run_type: item.run_type,
      title: item.title,
      created_at: item.created_at,
      summary: item.result.slice(0, 120)
    }));
}

function getHistoryItem(userId, id) {
  return db.data.analysisRuns.find((item) => item.id === id && item.user_id === userId) || null;
}

function deleteHistoryItem(userId, id) {
  const index = db.data.analysisRuns.findIndex((item) => item.id === id && item.user_id === userId);
  if (index < 0) return false;
  db.data.analysisRuns.splice(index, 1);
  db.save();
  return true;
}

function deleteUserData(userId) {
  db.data.apiKeys = db.data.apiKeys.filter((item) => item.user_id !== userId);
  db.data.analysisRuns = db.data.analysisRuns.filter((item) => item.user_id !== userId);
  db.data.membershipCodes.forEach((item) => {
    if (item.used_by === userId) {
      item.used_by = null;
      item.used_at = null;
    }
  });
  db.data.users = db.data.users.filter((item) => item.id !== userId);
  db.save();
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
  listHistory,
  getHistoryItem,
  deleteHistoryItem,
  deleteUserData
};
