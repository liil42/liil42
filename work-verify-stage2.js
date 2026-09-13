const http = require('http');
const BASE = 'http://localhost:3002';
const results = [];
function record(n, p, d) { results.push({ n, p, d: String(d).slice(0, 150) }); }
async function call(path, options = {}) {
  const res = await fetch(BASE + path, options);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { body = { raw: text.slice(0, 120) }; }
  return { status: res.status, body };
}
(async () => {
  const user = 'save' + Date.now();
  const password = 'test123456';
  let r = await call('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password }) });
  const token = r.body.token;
  const auth = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const code = 'const price = 10;\nconst count = 3;\nconst total = price * count;\nconsole.log(total);';

  r = await call('/api/analyze/snippet', { method: 'POST', headers: auth, body: JSON.stringify({ code, language: 'javascript' }) });
  record('分析会话创建', r.status === 200 && !!r.body.learning_session_id, r.status + ' ' + (r.body.message || (r.body.error && r.body.error.message) || ''));
  const sessionId = r.body.learning_session_id;

  r = await call('/api/learning/sessions/' + sessionId, { headers: auth });
  record('读取会话详情', r.status === 200 && !!r.body.session, r.status);
  const codeLines = String((r.body.session && r.body.session.code) || '').split(/\r?\n/).length;
  record('会话保存完整代码', r.status === 200 && codeLines === 4, 'lines=' + codeLines);

  r = await call('/api/learning/sessions', { headers: auth });
  record('会话列表包含新会话', r.status === 200 && (r.body.sessions || []).some((s) => s.id === sessionId), r.status);

  r = await call('/api/learning/history', { headers: auth });
  const history = (r.body.sessions || r.body.history || []);
  record('历史页可读到会话', r.status === 200 && history.length > 0, 'count=' + history.length);

  r = await call('/api/learning/categories', { headers: auth });
  const cats = r.body.categories || [];
  let catId = cats.length ? cats[0].id : null;
  if (!catId) { const c = await call('/api/learning/categories', { method: 'POST', headers: auth, body: JSON.stringify({ name: '重点项目' }) }); catId = c.body.category?.id || c.body.id; }
  record('分类可用', !!catId, 'cat=' + catId);

  r = await call('/api/learning/sessions/' + sessionId + '/category', { method: 'PUT', headers: auth, body: JSON.stringify({ categoryId: catId }) });
  record('历史分类保存', r.status === 200, r.status + ' ' + (r.body.message || ''));

  r = await call('/api/mistakes', { method: 'POST', headers: auth, body: JSON.stringify({ sessionId, itemType: 'line', startLine: 3, endLine: 3, title: '乘号这一行', codeSnippet: 'const total = price * count;', question: '为什么这里是乘法？' }) });
  record('一行代码加入错题库', r.status === 200 || r.status === 201, r.status + ' ' + (r.body.message || (r.body.error && r.body.error.message) || ''));
  const mistakeId = r.body.mistake?.id || r.body.item?.id || r.body.id;

  r = await call('/api/mistakes', { method: 'POST', headers: auth, body: JSON.stringify({ sessionId, itemType: 'function', startLine: 1, endLine: 4, title: '整段逻辑', codeSnippet: 'const price=10;...', question: '这段整体在干嘛？' }) });
  record('一个函数加入错题库', r.status === 200 || r.status === 201, r.status);

  r = await call('/api/mistakes', { headers: auth });
  const mistakes = r.body.mistakes || r.body.items || [];
  record('错题库可读取', r.status === 200 && mistakes.length >= 2, 'count=' + mistakes.length);

  if (mistakeId) {
    r = await call('/api/mistakes/' + mistakeId, { method: 'PUT', headers: auth, body: JSON.stringify({ status: 'reviewing', note: '先理解乘法' }) });
    record('错题可编辑', r.status === 200, r.status);
    r = await call('/api/mistakes/' + mistakeId + '/review-result', { method: 'POST', headers: auth, body: JSON.stringify({ result: 'wrong' }) });
    record('错题复习记录', r.status === 200, r.status + ' ' + JSON.stringify(r.body).slice(0, 100));
  } else {
    record('错题可编辑', false, '未取到 mistakeId');
    record('错题复习记录', false, '未取到 mistakeId');
  }

  const due = await call('/api/mistakes/due/count', { headers: auth });
  record('今日待复习接口', due.status === 200, due.status + ' ' + JSON.stringify(due.body).slice(0, 80));

  r = await call('/api/mistakes/' + mistakeId, { method: 'DELETE', headers: auth });
  record('错题可删除', r.status === 200, r.status);

  let fail = 0;
  for (const x of results) { if (!x.p) fail++; console.log((x.p ? 'PASS' : 'FAIL') + ' | ' + x.n + ' | ' + x.d); }
  console.log('TOTAL ' + (results.length - fail) + '/' + results.length);
})();
