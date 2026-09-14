const API = 'http://localhost:3002';

async function call(path, options = {}) {
  const response = await fetch(API + path, options);
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: response.status, body };
}

async function main() {
  const username = `注销测试${Date.now().toString().slice(-8)}`;
  const password = 'test123456';
  const jsonHeaders = { 'Content-Type': 'application/json' };

  let result = await call('/api/auth/register', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ username, password })
  });
  const token = result.body.token;
  const authHeaders = { ...jsonHeaders, Authorization: `Bearer ${token}` };
  const checks = [
    { name: '注册测试账号', pass: result.status === 200 && Boolean(token), detail: result.status }
  ];

  result = await call('/api/me/account', {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ password: 'wrong-password' })
  });
  checks.push({ name: '错误密码不能注销', pass: result.status === 401, detail: result.status });

  result = await call('/api/me/account', {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ password })
  });
  checks.push({ name: '正确密码可以注销账号', pass: result.status === 200, detail: result.status });

  result = await call('/api/auth/login', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ username, password })
  });
  checks.push({ name: '注销后旧账号不能登录', pass: result.status === 401, detail: result.status });

  result = await call('/api/auth/register', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ username, password })
  });
  checks.push({ name: '注销后用户名可以重新注册', pass: result.status === 200, detail: result.status });

  for (const check of checks) {
    console.log(`${check.pass ? 'PASS' : 'FAIL'} | ${check.name} | ${check.detail}`);
  }
  const passed = checks.filter((check) => check.pass).length;
  console.log(`TOTAL ${passed}/${checks.length}`);
  if (passed !== checks.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});