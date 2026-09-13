const base = 'http://127.0.0.1:3002';
const results = [];
function log(name, ok, extra = '') {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`);
}
async function call(path, options = {}, token) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
async function register(prefix) {
  const username = prefix + Date.now().toString().slice(-7) + Math.floor(Math.random() * 90 + 10);
  const response = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password: 'test123456' })
  });
  return { username, token: response.data.token, user: response.data.user, status: response.status };
}
(async () => {
  const a = await register('qaA');
  const b = await register('qaB');
  log('创建隔离测试用户 A/B', a.status === 200 && b.status === 200, `A=${a.username} B=${b.username}`);

  const keyA = await call('/api/settings/apikey', {
    method: 'POST',
    body: JSON.stringify({ provider: 'deepseek', apiKey: 'sk-test-a-not-real', baseUrl: '', model: 'deepseek-chat' })
  }, a.token);
  log('用户 A 保存 API Key 并返回脱敏值', keyA.status === 200 && keyA.data.user.apiKey && !keyA.data.user.apiKey.includes('not-real'), `mask=${keyA.data.user?.apiKey || ''}`);

  const meA = await call('/api/me', {}, a.token);
  log('API Key 配置可回读', meA.status === 200 && meA.data.user.provider === 'deepseek' && meA.data.user.model === 'deepseek-chat', `provider=${meA.data.user?.provider}`);

  const cat = await call('/api/learning/categories', {
    method: 'POST',
    body: JSON.stringify({ name: '支付模块', color: '#2563eb' })
  }, a.token);
  const categoryId = cat.data.category?.id;
  log('创建分类', cat.status === 201 && Boolean(categoryId), `id=${categoryId || ''}`);

  const duplicate = await call('/api/learning/categories', {
    method: 'POST',
    body: JSON.stringify({ name: '支付模块', color: '#2563eb' })
  }, a.token);
  log('重复分类被拒绝', duplicate.status === 409, `status=${duplicate.status}`);

  const updatedCategory = await call(`/api/learning/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: '支付与订单', color: '#0f766e' })
  }, a.token);
  log('修改分类', updatedCategory.status === 200 && updatedCategory.data.category?.name === '支付与订单', `name=${updatedCategory.data.category?.name}`);

  const crossCategory = await call(`/api/learning/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: '越权修改', color: '#000000' })
  }, b.token);
  log('用户 B 不能修改用户 A 的分类', crossCategory.status === 404, `status=${crossCategory.status}`);

  const badMistake = await call('/api/mistakes', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: 'missing-session', itemType: 'line', startLine: 1, endLine: 1,
      title: '测试', codeSnippet: 'x', question: '为什么'
    })
  }, a.token);
  log('不存在学习会话时拒绝创建错题', badMistake.status === 404, `status=${badMistake.status}`);

  const payment = await call('/api/payments/orders', { method: 'POST' }, a.token);
  const orderId = payment.data.order?.id;
  log('创建支付订单', payment.status === 201 && payment.data.order?.status === 'pending' && payment.data.order?.amountFen === 1, `order=${payment.data.order?.orderNo || ''}`);
  const reused = await call('/api/payments/orders', { method: 'POST' }, a.token);
  log('未支付时复用同一订单', reused.status === 201 && reused.data.order?.id === orderId && reused.data.reused === true, `reused=${reused.data.reused}`);

  const crossOrder = await call(`/api/payments/orders/${orderId}`, {}, b.token);
  log('用户 B 不能查看用户 A 的订单', crossOrder.status === 404, `status=${crossOrder.status}`);

  const paid = await call(`/api/payments/mock/${orderId}/pay`, { method: 'POST' }, a.token);
  log('模拟支付激活永久会员', paid.status === 200 && paid.data.order?.status === 'paid' && paid.data.user?.isMember === true, `member=${paid.data.user?.isMember}`);

  const paidAgain = await call(`/api/payments/mock/${orderId}/pay`, { method: 'POST' }, a.token);
  log('重复支付保持幂等', paidAgain.status === 200 && paidAgain.data.order?.status === 'paid' && paidAgain.data.alreadyPaid === true, `alreadyPaid=${paidAgain.data.alreadyPaid}`);

  const newOrder = await call('/api/payments/orders', { method: 'POST' }, a.token);
  log('会员不能重复创建会员订单', newOrder.status === 409, `status=${newOrder.status}`);

  const crossList = await call('/api/learning/categories', {}, b.token);
  log('用户 B 看不到用户 A 的分类', crossList.status === 200 && !(crossList.data.categories || []).some((item) => item.id === categoryId), `count=${(crossList.data.categories || []).length}`);

  const cleanupA = await call('/api/me/account', { method: 'DELETE', body: JSON.stringify({ password: 'test123456' }) }, a.token);
  const cleanupB = await call('/api/me/account', { method: 'DELETE', body: JSON.stringify({ password: 'test123456' }) }, b.token);
  log('清理测试账号', cleanupA.status === 200 && cleanupB.status === 200, `A=${cleanupA.status} B=${cleanupB.status}`);

  const failed = results.filter((item) => !item.ok);
  console.log(`SUMMARY total=${results.length} passed=${results.length - failed.length} failed=${failed.length}`);
  if (failed.length) process.exitCode = 1;
})();
