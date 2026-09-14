const BASE = 'http://localhost:3002';
(async () => {
  const user = 'dbg' + Date.now();
  const password = 'test123456';
  let r = await fetch(BASE + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password }) });
  const { token } = await r.json();
  const auth = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  await fetch(BASE + '/api/settings/apikey', { method: 'POST', headers: auth, body: JSON.stringify({ provider: 'custom', apiKey: 'sk-test-local', baseUrl: 'http://127.0.0.1:9099/v1' }) });
  const code = 'const price = 10;\nconst count = 3;\nconst total = price * count;';
  r = await fetch(BASE + '/api/analyze/snippet', { method: 'POST', headers: auth, body: JSON.stringify({ code, language: 'javascript' }) });
  const body = await r.json();
  console.log('response keys:', Object.keys(body));
  console.log('analysis:', JSON.stringify(body).slice(0, 400));
})();
