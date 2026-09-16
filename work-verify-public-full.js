const BASE = process.env.PUBLIC_API_BASE || 'https://daimaxuexi-production.up.railway.app';
const API_KEY = String(process.env.DEEPSEEK_API_KEY || '').trim();
const results = [];

function mask(value) {
  if (!value) return '';
  return value.slice(0, 6) + '***' + value.slice(-4);
}

function record(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail: String(detail ?? '').slice(0, 220) });
}

async function call(path, options = {}) {
  let response;
  try {
    response = await fetch(BASE + path, { ...options, signal: AbortSignal.timeout(120000) });
  } catch (error) {
    return { status: 0, body: { error: { message: String(error.message || error) } } };
  }
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text.slice(0, 300) }; }
  return { status: response.status, body };
}

function jsonHeaders(token) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function main() {
  if (!API_KEY) {
    console.error('缺少 DEEPSEEK_API_KEY。请先在当前 PowerShell 设置后重试，不要把 Key 写入文件。');
    process.exit(2);
  }
  if (!API_KEY.startsWith('sk-')) {
    console.error(`DEEPSEEK_API_KEY 格式可疑：${mask(API_KEY)}`);
    process.exit(2);
  }

  const username = 'full' + Date.now().toString().slice(-10);
  const password = 'Test123456!';
  let token = '';
  let sessionId = '';
  let mistakeId = '';

  try {
    let r = await call('/api/auth/register', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ username, password })
    });
    token = r.body?.token || '';
    record('注册临时账号', r.status === 200 && !!token, `${r.status} ${username}`);

    if (!token) throw new Error('注册失败，无法继续');

    r = await call('/api/settings/apikey', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ provider: 'deepseek', apiKey: API_KEY, model: 'deepseek-chat' })
    });
    record('保存真实 DeepSeek Key', r.status === 200 && r.body?.success !== false, `${r.status}`);

    const code = 'const price = 10;\nconst count = 3;\nconst total = price * count;\nconsole.log(total);';
    r = await call('/api/analyze/snippet', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ code, language: 'javascript', style: 'beginner' })
    });
    sessionId = r.body?.learning_session_id || '';
    record('AI 分析并创建学习会话', r.status === 200 && !!sessionId, `${r.status} session=${sessionId || 'none'} ${r.body?.error?.message || r.body?.message || ''}`);

    if (!sessionId) throw new Error('AI 分析失败；请检查 Key 是否有效、是否欠费、模型是否可用');

    r = await call(`/api/learning/sessions/${sessionId}`, { headers: jsonHeaders(token) });
    const session = r.body?.session || {};
    record('会话保存完整代码', r.status === 200 && String(session.code || '').split(/\r?\n/).length === 4, `lines=${String(session.code || '').split(/\r?\n/).length}`);
    record('会话保存完整分析', r.status === 200 && Boolean(session.analysis), `keys=${Object.keys(session.analysis || {}).join(',')}`);

    r = await call(`/api/learning/sessions/${sessionId}/lines/3/explain`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({})
    });
    record('逐行 AI 讲解', r.status === 200 && !!r.body?.insight, `${r.status} ${r.body?.error?.message || ''}`);

    r = await call(`/api/learning/sessions/${sessionId}/lines/3/questions`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ question: '为什么这里是乘法？' })
    });
    record('单行提问保存', r.status === 200 && !!r.body?.question, `${r.status} ${r.body?.error?.message || ''}`);

    r = await call(`/api/learning/sessions/${sessionId}/lines/3/understandings`, {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ content: 'total 是把单价乘以数量得到的总价。' })
    });
    record('用户理解保存', r.status === 200 && !!r.body?.understanding, `${r.status} ${r.body?.error?.message || ''}`);

    r = await call(`/api/learning/sessions/${sessionId}`, { headers: jsonHeaders(token) });
    const full = r.body?.session || {};
    record('详情包含逐行讲解', Array.isArray(full.insights) ? full.insights.length > 0 : !!full.insights, `count=${(full.insights || []).length}`);
    record('详情包含提问', Array.isArray(full.questions) ? full.questions.length > 0 : !!full.questions, `count=${(full.questions || []).length}`);
    record('详情包含用户理解', Array.isArray(full.understandings) ? full.understandings.length > 0 : !!full.understandings, `count=${(full.understandings || []).length}`);

    r = await call('/api/learning/history', { headers: jsonHeaders(token) });
    record('历史页读取新会话', r.status === 200 && (r.body?.sessions || []).some((item) => item.id === sessionId), `count=${(r.body?.sessions || []).length}`);

    r = await call('/api/learning/categories', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({ name: '全链路验收', color: '#22d3ee' })
    });
    const categoryId = r.body?.category?.id || '';
    record('自定义分类新增', r.status === 201 && !!categoryId, `${r.status} ${categoryId}`);

    if (categoryId) {
      r = await call(`/api/learning/sessions/${sessionId}/category`, {
        method: 'PUT',
        headers: jsonHeaders(token),
        body: JSON.stringify({ categoryId })
      });
      record('历史归入分类', r.status === 200, `${r.status} ${r.body?.error?.message || ''}`);

      r = await call(`/api/learning/categories/${categoryId}`, {
        method: 'PUT',
        headers: jsonHeaders(token),
        body: JSON.stringify({ name: '全链路验收-改名', color: '#38bdf8' })
      });
      record('分类改名', r.status === 200 && r.body?.category?.name === '全链路验收-改名', `${r.status}`);
    }

    r = await call('/api/mistakes', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        sessionId,
        categoryId: categoryId || null,
        itemType: 'line',
        startLine: 3,
        endLine: 3,
        title: '乘号这一行',
        codeSnippet: 'const total = price * count;',
        question: '为什么这里是乘法？'
      })
    });
    mistakeId = r.body?.mistake?.id || '';
    record('一行代码加入错题', (r.status === 200 || r.status === 201) && !!mistakeId, `${r.status} ${mistakeId}`);

    r = await call('/api/mistakes', {
      method: 'POST',
      headers: jsonHeaders(token),
      body: JSON.stringify({
        sessionId,
        itemType: 'function',
        startLine: 1,
        endLine: 4,
        title: '整段逻辑',
        codeSnippet: code,
        question: '这段整体在干嘛？'
      })
    });
    record('一个函数加入错题', r.status === 200 || r.status === 201, `${r.status} ${r.body?.error?.message || ''}`);

    r = await call('/api/mistakes', { headers: jsonHeaders(token) });
    record('错题库读取至少 2 条', r.status === 200 && (r.body?.mistakes || []).length >= 2, `count=${(r.body?.mistakes || []).length}`);

    if (mistakeId) {
      r = await call(`/api/mistakes/${mistakeId}`, {
        method: 'PUT',
        headers: jsonHeaders(token),
        body: JSON.stringify({ note: '先理解乘法', status: 'reviewing' })
      });
      record('错题编辑', r.status === 200, `${r.status}`);

      r = await call(`/api/mistakes/${mistakeId}/review-result`, {
        method: 'POST',
        headers: jsonHeaders(token),
        body: JSON.stringify({ result: 'wrong' })
      });
      record('错题复习记录', r.status === 200, `${r.status}`);

      r = await call('/api/mistakes/due/count', { headers: jsonHeaders(token) });
      record('待复习数量查询', r.status === 200 && typeof r.body?.count === 'number', `count=${r.body?.count}`);

      r = await call(`/api/mistakes/${mistakeId}`, { method: 'DELETE', headers: jsonHeaders(token) });
      record('错题删除', r.status === 200, `${r.status}`);
    }

    if (categoryId) {
      r = await call(`/api/learning/categories/${categoryId}`, { method: 'DELETE', headers: jsonHeaders(token) });
      record('分类删除', r.status === 200, `${r.status}`);
    }

    r = await call('/api/me/account', {
      method: 'DELETE',
      headers: jsonHeaders(token),
      body: JSON.stringify({ password })
    });
    record('注销账号并清理关联数据', r.status === 200, `${r.status}`);

    r = await call('/api/auth/register', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ username, password })
    });
    record('注销后用户名可重注册', r.status === 200 && !!r.body?.token, `${r.status}`);
    if (r.body?.token) {
      await call('/api/me/account', {
        method: 'DELETE',
        headers: jsonHeaders(r.body.token),
        body: JSON.stringify({ password })
      });
    }
  } finally {
    if (token) {
      await call('/api/me/account', {
        method: 'DELETE',
        headers: jsonHeaders(token),
        body: JSON.stringify({ password })
      }).catch(() => {});
    }
  }

  for (const item of results) {
    console.log(`${item.pass ? 'PASS' : 'FAIL'} | ${item.name} | ${item.detail}`);
  }
  const failed = results.filter((item) => !item.pass);
  console.log(`SUMMARY total=${results.length} pass=${results.length - failed.length} fail=${failed.length}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`SCRIPT_ERROR ${error.message}`);
  process.exit(2);
});
