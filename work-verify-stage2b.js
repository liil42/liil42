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

  r = await call('/api/settings/apikey', { method: 'POST', headers: auth, body: JSON.stringify({ provider: 'custom', apiKey: 'sk-test-local', baseUrl: 'http://127.0.0.1:9099/v1' }) });
  record('保存 API Key（指向本地假 AI）', r.status === 200, r.status + ' ' + (r.body.message || ''));

  const code = 'const price = 10;\nconst count = 3;\nconst total = price * count;\nconsole.log(total);';
  r = await call('/api/analyze/snippet', { method: 'POST', headers: auth, body: JSON.stringify({ code, language: 'javascript' }) });
  record('分析并创建学习会话', r.status === 200 && !!r.body.learning_session_id, r.status + ' ' + (r.body.message || (r.body.error && r.body.error.message) || ''));
  const sessionId = r.body.learning_session_id;
  if (!sessionId) {
    let fail = 0;
    for (const x of results) { if (!x.p) fail++; console.log((x.p ? 'PASS' : 'FAIL') + ' | ' + x.n + ' | ' + x.d); }
    console.log('TOTAL ' + (results.length - fail) + '/' + results.length);
    return;
  }

  r = await call('/api/learning/sessions/' + sessionId, { headers: auth });
  record('读取会话详情', r.status === 200 && !!r.body.session, r.status);
  const session = r.body.session || {};
  record('会话保存完整代码（4 行）', String(session.code || '').split(/\r?\n/).length === 4, 'lines=' + String(session.code || '').split(/\r?\n/).length);
  record('会话保存完整分析 JSON', session.analysis && (session.analysis.explanation || session.analysis.summary), JSON.stringify(session.analysis || {}).slice(0, 80));

  r = await call('/api/learning/sessions/' + sessionId + '/lines/3/explain', { method: 'POST', headers: auth, body: JSON.stringify({}) });
  record('逐行提问：AI 讲解一行', r.status === 200 && !!r.body.insight, r.status + ' ' + (r.body.message || ''));

  r = await call('/api/learning/sessions/' + sessionId + '/lines/3/questions', { method: 'POST', headers: auth, body: JSON.stringify({ question: '为什么这里是乘法？' }) });
  record('单行提问能保存', r.status === 200 && !!r.body.question, r.status + ' ' + (r.body.message || ''));

  r = await call('/api/learning/sessions/' + sessionId + '/lines/3/understandings', { method: 'POST', headers: auth, body: JSON.stringify({ content: 'total 是把单价乘以数量得到的总价。' }) });
  record('用户自己的理解能保存', r.status === 200 && !!r.body.understanding, r.status + ' ' + (r.body.message || ''));

  r = await call('/api/learning/sessions/' + sessionId, { headers: auth });
  const full = r.body.session || {};
  record('会话详情包含逐行讲解', Array.isArray(full.insights) ? full.insights.length > 0 : !!full.insights, JSON.stringify(Object.keys(full)));
  record('会话详情包含提问', Array.isArray(full.questions) ? full.questions.length > 0 : !!full.questions, 'questions=' + JSON.stringify((full.questions || []).length));
  record('会话详情包含用户理解', Array.isArray(full.understandings) ? full.understandings.length > 0 : !!full.understandings, 'understandings=' + JSON.stringify((full.understandings || []).length));

  r = await call('/api/learning/history', { headers: auth });
  const sessions = r.body.sessions || [];
  record('历史页能读到新会话', r.status === 200 && sessions.some((s) => s.id === sessionId), 'count=' + sessions.length);

  r = await call('/api/learning/categories', { headers: auth });
  let catId = (r.body.categories || [])[0]?.id;
  if (!catId) { const c = await call('/api/learning/categories', { method: 'POST', headers: auth, body: JSON.stringify({ name: '普通项目' }) }); catId = c.body.category?.id || c.body.id; }
  r = await call('/api/learning/sessions/' + sessionId + '/category', { method: 'PUT', headers: auth, body: JSON.stringify({ categoryId: catId }) });
  record('历史可归入分类', r.status === 200, r.status + ' ' + (r.body.message || ''));

  r = await call('/api/mistakes', { method: 'POST', headers: auth, body: JSON.stringify({ sessionId, itemType: 'line', startLine: 3, endLine: 3, title: '乘号这一行', codeSnippet: 'const total = price * count;', question: '为什么这里是乘法？' }) });
  record('一行代码加入错题库', r.status === 200 || r.status === 201, r.status + ' ' + (r.body.message || (r.body.error && r.body.error.message) || ''));
  const mistakeId = r.body.mistake?.id || r.body.item?.id || r.body.id;
  record('错题返回 id', !!mistakeId, String(mistakeId));

  r = await call('/api/mistakes', { method: 'POST', headers: auth, body: JSON.stringify({ sessionId, itemType: 'function', startLine: 1, endLine: 4, title: '整段逻辑', codeSnippet: 'const price=10;...', question: '这段整体在干嘛？' }) });
  record('一个函数加入错题库', r.status === 200 || r.status === 201, r.status + ' ' + (r.body.message || (r.body.error && r.body.error.message) || ''));

  r = await call('/api/mistakes', { headers: auth });
  const mistakes = r.body.mistakes || r.body.items || [];
  record('错题库可读取（>=2 条）', r.status === 200 && mistakes.length >= 2, 'count=' + mistakes.length);

  if (mistakeId) {
    r = await call('/api/mistakes/' + mistakeId, { method: 'PUT', headers: auth, body: JSON.stringify({ note: '先理解乘法', status: 'reviewing' }) });
    record('错题可编辑', r.status === 200, r.status + ' ' + (r.body.message || ''));
    r = await call('/api/mistakes/' + mistakeId + '/review-result', { method: 'POST', headers: auth, body: JSON.stringify({ result: 'wrong' }) });
    record('错题复习记录（间隔重复）', r.status === 200, r.status + ' ' + JSON.stringify(r.body).slice(0, 110));
    r = await call('/api/mistakes/due/count', { headers: auth });
    record('今日待复习可查询', r.status === 200 && typeof r.body.count === 'number', 'count=' + r.body.count);
    r = await call('/api/mistakes/' + mistakeId, { method: 'DELETE', headers: auth });
    record('错题可删除', r.status === 200, r.status);
  } else {
    record('错题可编辑', false, '无 mistakeId');
    record('错题复习记录（间隔重复）', false, '无 mistakeId');
    record('今日待复习可查询', false, '无 mistakeId');
    record('错题可删除', false, '无 mistakeId');
  }

  let fail = 0;
  for (const x of results) { if (!x.p) fail++; console.log((x.p ? 'PASS' : 'FAIL') + ' | ' + x.n + ' | ' + x.d); }
  console.log('TOTAL ' + (results.length - fail) + '/' + results.length);
})();

