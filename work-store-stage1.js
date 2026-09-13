const assert = require('assert');
const { createLearningStore } = require('./server/src/learning-store');

const results = [];

function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
    console.log(`FAIL ${name} :: ${error.message}`);
  }
}

const store = createLearningStore(':memory:');
const userId = 'user-a';
const otherUserId = 'user-b';

let category;
let otherCategory;
let session;

check('创建用户分类', () => {
  category = store.createCategory(userId, '函数基础', '#38bdf8');
  otherCategory = store.createCategory(otherUserId, '其他用户分类', '#f97316');
  assert.ok(category.id);
  assert.strictEqual(category.name, '函数基础');
});

check('创建学习会话并关联分类', () => {
  session = store.createSession({
    userId,
    analysisRunId: 'run-1',
    sourceType: 'snippet',
    fileName: 'demo.js',
    language: 'javascript',
    code: 'function add(a, b) {\n  return a + b;\n}',
    analysis: { explanation: '两数相加', risk_level: '低' },
    categoryId: category.id
  });
  assert.strictEqual(session.categoryId, category.id);
  assert.strictEqual(session.categoryName, '函数基础');
  assert.strictEqual(session.analysis.explanation, '两数相加');
});

let mistake;

check('创建行错题', () => {
  mistake = store.addMistake({
    userId,
    sessionId: session.id,
    categoryId: category.id,
    itemType: 'line',
    startLine: 2,
    endLine: 2,
    title: '第 2 行',
    codeSnippet: 'return a + b;',
    question: '为什么这里要 return',
    note: '待复习'
  });
  assert.strictEqual(mistake.status, 'unresolved');
  assert.strictEqual(mistake.reviewCount, 0);
});

check('按状态和分类筛选错题', () => {
  const rows = store.listMistakes(userId, {
    status: 'unresolved',
    categoryId: category.id,
    itemType: 'line'
  });
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].id, mistake.id);
  assert.strictEqual(rows[0].categoryName, '函数基础');
});

check('其他用户看不到该错题', () => {
  assert.strictEqual(store.listMistakes(otherUserId).length, 0);
});

check('复习错题后进入复习中并累计次数', () => {
  const reviewed = store.reviewMistake(userId, mistake.id);
  assert.strictEqual(reviewed.status, 'reviewing');
  assert.strictEqual(reviewed.reviewCount, 1);
});

check('标记错题为已掌握', () => {
  const resolved = store.updateMistake(userId, mistake.id, { status: 'resolved' });
  assert.strictEqual(resolved.status, 'resolved');
  assert.ok(resolved.resolvedAt);
});

check('重新复习已掌握错题会回到复习中', () => {
  const reviewed = store.reviewMistake(userId, mistake.id);
  assert.strictEqual(reviewed.status, 'reviewing');
  assert.strictEqual(reviewed.reviewCount, 2);
  assert.strictEqual(reviewed.resolvedAt, null);
});

check('删除分类后错题保留且分类被清空', () => {
  assert.strictEqual(store.deleteCategory(userId, category.id), true);
  const rows = store.listMistakes(userId);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].categoryId, null);
  assert.strictEqual(rows[0].categoryName, null);
  const updatedSession = store.getSession(userId, session.id);
  assert.strictEqual(updatedSession.categoryId, null);
});

check('其他用户不能更新或删除该错题', () => {
  assert.strictEqual(store.updateMistake(otherUserId, mistake.id, { status: 'resolved' }), null);
  assert.strictEqual(store.reviewMistake(otherUserId, mistake.id), null);
  assert.strictEqual(store.deleteMistake(otherUserId, mistake.id), false);
});

check('删除错题', () => {
  assert.strictEqual(store.deleteMistake(userId, mistake.id), true);
  assert.strictEqual(store.listMistakes(userId).length, 0);
});

check('删除用户数据清空会话、分类和错题', () => {
  const localSession = store.createSession({
    userId,
    sourceType: 'snippet',
    fileName: 'again.js',
    language: 'javascript',
    code: 'const x = 1;',
    analysis: {}
  });
  store.createCategory(userId, '临时分类', '#38bdf8');
  store.addMistake({
    userId,
    sessionId: localSession.id,
    itemType: 'line',
    startLine: 1,
    endLine: 1,
    title: '第 1 行',
    codeSnippet: 'const x = 1;',
    question: '为什么'
  });
  store.deleteUserData(userId);
  assert.strictEqual(store.listSessionSummaries(userId).length, 0);
  assert.strictEqual(store.listCategories(userId).length, 0);
  assert.strictEqual(store.listMistakes(userId).length, 0);
  assert.ok(otherCategory.id);
});

store.close();

const failed = results.filter((item) => !item.ok);
console.log(`SUMMARY total=${results.length} passed=${results.length - failed.length} failed=${failed.length}`);
if (failed.length) process.exitCode = 1;
