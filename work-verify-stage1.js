const BASE = 'http://localhost:3002';
const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail: String(detail).slice(0, 160) });
}
async function call(path, options = {}) {
  const res = await fetch(BASE + path, options);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { body = { raw: text.slice(0, 120) }; }
  return { status: res.status, body };
}
(async () => {
  const user = 'eval' + Date.now();
  const password = 'test123456';

  let r = await call('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password }) });
  record('注册', r.status === 200 && !!r.body.token, r.status + ' ' + JSON.stringify(r.body).slice(0, 80));
  const token = r.body.token;
  const auth = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };

  r = await call('/api/me', { headers: auth });
  record('获取当前用户', r.status === 200 && r.body.user && r.body.user.username === user, r.status);

  r = await call('/api/analyze/snippet', { method: 'POST', headers: auth, body: JSON.stringify({ code: 'const a = 1;' }) });
  record('未配置 API Key 应提示可操作中文', r.status === 400 && /API Key/.test(r.body.message || (r.body.error && r.body.error.message) || ''), r.status + ' ' + (r.body.message || JSON.stringify(r.body.error)));

  r = await call('/api/payments/orders', { method: 'POST', headers: auth, body: '{}' });
  record('支付下单路由应已下线', r.status === 404, r.status);

  r = await call('/api/payments/orders', { headers: auth });
  record('查询支付订单路由应已下线', r.status === 404, r.status);

  r = await call('/api/analyze/snippet', { method: 'POST', headers: auth, body: JSON.stringify({ code: '' }) });
  record('空代码应 400', r.status === 400, r.status + ' ' + (r.body.message || ''));

  r = await call('/api/analyze/snippet', { method: 'POST', headers: auth, body: JSON.stringify({ code: 'x'.repeat(200001) }) });
  record('超长代码应 400', r.status === 400, r.status);

  r = await call('/api/me', { headers: { Authorization: 'Bearer forged.token.value' } });
  record('伪造 token 应 401', r.status === 401, r.status);

  r = await call('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password }) });
  record('重复用户名应 409', r.status === 409, r.status);

  r = await call('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: 'wrong123456' }) });
  record('错误密码应 401', r.status === 401, r.status);

  r = await call('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'ab', password: '123' }) });
  record('短用户名短密码应 400', r.status === 400, r.status);

  r = await call('/api/learning/categories', { headers: auth });
  record('读取分类', r.status === 200 && Array.isArray(r.body.categories), r.status);

  r = await call('/api/learning/categories', { method: 'POST', headers: auth, body: JSON.stringify({ name: '重点项目' }) });
  record('新建自定义分类', r.status === 200 || r.status === 201, r.status);

  r = await call('/api/mistakes', { headers: auth });
  record('读取错题库', r.status === 200, r.status);

  r = await call('/api/learning/history', { headers: auth });
  record('读取学习历史', r.status === 200, r.status);

  r = await call('/api/mistakes/due/count', { headers: auth });
  record('今日待复习数量', r.status === 200 && typeof r.body.count === 'number', r.status + ' ' + JSON.stringify(r.body));

  let fail = 0;
  for (const item of results) { if (!item.pass) fail += 1; console.log((item.pass ? 'PASS' : 'FAIL') + ' | ' + item.name + ' | ' + item.detail); }
  console.log('TOTAL ' + (results.length - fail) + '/' + results.length);
})();

