const base = 'http://127.0.0.1:3002';
const results = [];

function log(name, ok, extra = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`);
}

async function call(path, options = {}, token) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(base + path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function register(prefix) {
  const username = prefix + Date.now().toString().slice(-7) + Math.floor(Math.random() * 90 + 10);
  const response = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password: 'test123456' })
  });
  return {
    username,
    token: response.data.token,
    user: response.data.user,
    status: response.status
  };
}

(async () => {
  const a = await register('flowA');
  const b = await register('flowB');
  log('创建学习闭环测试用户', a.status === 200 && b.status === 200, `A=${a.username} B=${b.username}`);

  const category = await call('/api/learning/categories', {
    method: 'POST',
    body: JSON.stringify({ name: '函数理解', color: '#0ea5e9' })
  }, a.token);
  const categoryId = category.data.category?.id;

  const sessionsBefore = await call('/api/learning/sessions', {}, a.token);
  log('空历史可正常读取', sessionsBefore.status === 200 && Array.isArray(sessionsBefore.data.sessions), `count=${sessionsBefore.data.sessions?.length}`);

  const noSessionCategory = await call('/api/learning/sessions/not-exists/category', {
    method: 'PUT',
    body: JSON.stringify({ categoryId })
  }, a.token);
  log('不存在会话不能分配分类', noSessionCategory.status === 404, `status=${noSessionCategory.status}`);

  const foreignCategory = await call('/api/learning/sessions/not-exists/category', {
    method: 'PUT',
    body: JSON.stringify({ categoryId })
  }, b.token);
  log('他人分类不能用于当前用户会话', foreignCategory.status === 404, `status=${foreignCategory.status}`);

  const categoryB = await call('/api/learning/categories', {
    method: 'POST',
    body: JSON.stringify({ name: '用户B分类', color: '#f97316' })
  }, b.token);
  const crossAssign = await call('/api/learning/sessions/not-exists/category', {
    method: 'PUT',
    body: JSON.stringify({ categoryId: categoryB.data.category?.id })
  }, a.token);
  log('跨用户分类赋值被拒绝', crossAssign.status === 404, `status=${crossAssign.status}`);

  const mistakes = await call('/api/mistakes?status=unresolved&itemType=line', {}, a.token);
  log('错题筛选参数可用', mistakes.status === 200 && Array.isArray(mistakes.data.mistakes), `count=${mistakes.data.mistakes?.length}`);

  const invalidType = await call('/api/mistakes', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: 'x',
      itemType: 'invalid',
      startLine: 1,
      endLine: 1,
      title: 'x',
      codeSnippet: 'x',
      question: 'x'
    })
  }, a.token);
  log('非法错题类型被拒绝', invalidType.status === 404, `status=${invalidType.status}`);

  const deleteCategory = await call(`/api/learning/categories/${categoryId}`, { method: 'DELETE' }, a.token);
  log('删除分类', deleteCategory.status === 200 && deleteCategory.data.ok === true, `status=${deleteCategory.status}`);

  const categoriesAfter = await call('/api/learning/categories', {}, a.token);
  log('删除后分类列表不含目标', categoriesAfter.status === 200 && !(categoriesAfter.data.categories || []).some((item) => item.id === categoryId), `count=${categoriesAfter.data.categories?.length}`);

  const deleteAgain = await call(`/api/learning/categories/${categoryId}`, { method: 'DELETE' }, a.token);
  log('重复删除返回不存在', deleteAgain.status === 404, `status=${deleteAgain.status}`);

  const crossDelete = await call(`/api/learning/categories/${categoryB.data.category?.id}`, { method: 'DELETE' }, a.token);
  log('用户 A 不能删除用户 B 的分类', crossDelete.status === 404, `status=${crossDelete.status}`);

  const cleanupA = await call('/api/me/account', { method: 'DELETE', body: JSON.stringify({ password: 'test123456' }) }, a.token);
  const cleanupB = await call('/api/me/account', { method: 'DELETE', body: JSON.stringify({ password: 'test123456' }) }, b.token);
  log('清理测试账号', cleanupA.status === 200 && cleanupB.status === 200, `A=${cleanupA.status} B=${cleanupB.status}`);

  const staleA = await call('/api/me', {}, a.token);
  const staleB = await call('/api/me', {}, b.token);
  log('注销后旧令牌失效', staleA.status === 401 && staleB.status === 401, `A=${staleA.status} B=${staleB.status}`);

  const failed = results.filter((item) => !item.ok);
  console.log(`SUMMARY total=${results.length} passed=${results.length - failed.length} failed=${failed.length}`);
  if (failed.length) process.exitCode = 1;
})();
