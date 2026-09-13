const BASE = 'http://localhost:3002';
(async () => {
  const user = 'probe' + Date.now();
  const password = 'test123456';
  let r = await fetch(BASE + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password }) });
  const body = await r.json();
  const auth = { Authorization: 'Bearer ' + body.token, 'Content-Type': 'application/json' };
  const res = await fetch(BASE + '/api/payments/orders', { headers: auth });
  console.log('status', res.status, 'body', await res.text());
})();
