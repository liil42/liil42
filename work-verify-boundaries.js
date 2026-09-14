const API = 'http://localhost:3002';
const results = [];
function record(name, pass, detail) { results.push({ name, pass, detail: String(detail ?? '').slice(0, 180) }); }
async function call(path, options = {}) {
  const response = await fetch(API + path, options);
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { status: response.status, body };
}
async function main() {
  const username = `边界测试${Date.now().toString().slice(-8)}`;
  const password = 'test123456';
  const json = { 'Content-Type': 'application/json' };
  let r = await call('/api/auth/register', { method: 'POST', headers: json, body: JSON.stringify({ username, password }) });
  const token = r.body.token;
  const auth = { ...json, Authorization: `Bearer ${token}` };
  record('注册边界测试账号', r.status === 200 && !!token, r.status);

  r = await call('/api/auth/register', { method: 'POST', headers: json, body: JSON.stringify({ username, password }) });
  record('重复用户名返回 409', r.status === 409, `${r.status} ${r.body.error?.message || ''}`);

  r = await call('/api/auth/login', { method: 'POST', headers: json, body: JSON.stringify({ username, password: 'bad-password' }) });
  record('错误密码返回 401', r.status === 401, `${r.status} ${r.body.error?.message || ''}`);

  r = await call('/api/me', { headers: { Authorization: 'Bearer invalid-token' } });
  record('无效 token 返回 401', r.status === 401, `${r.status} ${r.body.error?.message || ''}`);

  r = await call('/api/analyze/snippet', { method: 'POST', headers: auth, body: JSON.stringify({ code: 'const x = 1;' }) });
  record('未配置 API Key 返回明确提示', r.status === 400 && /API Key/.test(r.body.error?.message || ''), `${r.status} ${r.body.error?.message || ''}`);

  await call('/api/settings/apikey', { method: 'POST', headers: auth, body: JSON.stringify({ provider: 'custom', apiKey: 'sk-local', baseUrl: 'http://127.0.0.1:9099/v1' }) });
  r = await call('/api/analyze/snippet', { method: 'POST', headers: auth, body: JSON.stringify({ code: '' }) });
  record('空代码返回 400', r.status === 400, `${r.status} ${r.body.error?.message || ''}`);

  r = await call('/api/analyze/snippet', { method: 'POST', headers: auth, body: JSON.stringify({ code: 'x'.repeat(200001) }) });
  record('超长代码返回 400', r.status === 400, `${r.status} ${r.body.error?.message || ''}`);

  r = await call('/api/analyze/snippet', { method: 'POST', headers: auth, body: JSON.stringify({ code: 'const x = 1;', language: 'javascript' }) });
  record('正常代码仍可分析', r.status === 200 && !!r.body.learning_session_id, `${r.status}`);

  for (const item of results) console.log(`${item.pass ? 'PASS' : 'FAIL'} | ${item.name} | ${item.detail}`);
  const passed = results.filter((item) => item.pass).length;
  console.log(`TOTAL ${passed}/${results.length}`);
  if (passed !== results.length) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exit(1); });