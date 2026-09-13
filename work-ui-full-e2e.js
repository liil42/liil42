const http = require('http');
const { spawn } = require('child_process');

const port = 3199;
const received = [];

function jsonResponse(res, payload, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

const fakeAI = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let parsed = {};
    try { parsed = JSON.parse(body || '{}'); } catch {}
    received.push({ url: req.url, model: parsed.model, messages: parsed.messages });
    const system = String(parsed.messages?.[0]?.content || '');
    const user = String(parsed.messages?.[1]?.content || '');
    let content;
    if (system.includes('片段')) {
      content = {
        explanation: '这一行先把价格和数量相乘，再把结果放进 total。像把单价和件数交给收银员算出总价。',
        file: '示例代码',
        confidence: '高',
        risk_level: '低',
        risk_reason: '表达式简单，没有明显风险。',
        alternative_code: 'const total = price * count;'
      };
    } else if (system.includes('逐行')) {
      content = {
        plain_explanation: '先读取 price 和 count，再相乘，把结果赋给 total。',
        analogy: '像先拿到单价和数量，再算出总价。',
        tokens: [
          { text: 'price', meaning: '商品单价' },
          { text: 'count', meaning: '购买数量' },
          { text: 'total', meaning: '算出的总价' }
        ],
        execution_before: '已有 price 和 count。',
        execution_after: 'total 得到两者乘积。',
        why_here: '这一行完成总价计算。',
        if_wrong: '变量名写错会找不到值。',
        must_know: ['乘号用来计算总价。']
      };
    } else if (system.includes('理解')) {
      content = {
        correct_parts: ['你已经知道这一行在计算总价。'],
        missing_parts: ['可以补充变量代表单价和数量。'],
        wrong_parts: [],
        guiding_question: '如果数量变成 0，总价会是多少？',
        standard_explanation: '这行把单价乘以数量，得到总价。',
        encouragement: '你抓住了核心方向，再补充变量含义就更完整了。'
      };
    } else if (system.includes('练习')) {
      content = {
        correct_parts: ['你判断出结果会变化。'],
        missing_parts: [],
        wrong_parts: [],
        encouragement: '思路是对的，继续保持。',
        standard_explanation: '改变 quantity 后，total 会重新计算。'
      };
    } else if (system.includes('提问')) {
      content = {
        answer: '因为乘法需要两个数，price 和 count 分别代表单价和数量。',
        correction: '',
        key_takeaway: '先看每个变量代表什么。'
      };
    } else {
      content = { explanation: '这是测试分析结果。', confidence: '高' };
    }
    jsonResponse(res, { choices: [{ message: { content: JSON.stringify(content) } }] });
  });
});

fakeAI.listen(port, '127.0.0.1', async () => {
  const child = spawn(process.execPath, ['server/src/index.js'], {
    cwd: 'F:/AI-codex/daimaxuexi',
    env: { ...process.env, PORT: '3201', LEARNING_DB_PATH: 'F:/AI-codex/daimaxuexi/data/ui-e2e.db' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let serverErr = '';
  child.stderr.on('data', d => { serverErr += d.toString(); });
  await new Promise(r => setTimeout(r, 1200));

  const base = 'http://127.0.0.1:3201';
  async function request(path, options = {}, token = '') {
    const res = await fetch(base + path, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(options.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(res.status + ' ' + (data.message || path));
    return data;
  }

  const username = 'FULL' + Date.now();
  const password = 'test123456';
  const results = [];
  try {
    const reg = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
    const token = reg.token;
    results.push('注册');
    await request('/api/settings/apikey', { method: 'POST', body: JSON.stringify({ provider: 'custom', apiKey: 'ui-test-key', baseUrl: 'http://127.0.0.1:' + port + '/v1', model: 'ui-test-model' }) }, token);
    results.push('保存API Key');
    const analysis = await request('/api/analyze/snippet', { method: 'POST', body: JSON.stringify({ code: 'const total = price * count;', language: 'javascript' }) }, token);
    results.push('分析成功');
    const sid = analysis.learning_session_id;
    const line = await request('/api/learning/sessions/' + sid + '/lines/1/explain', { method: 'POST' }, token);
    results.push('行解释成功');
    await request('/api/learning/sessions/' + sid + '/lines/1/understandings', { method: 'POST', body: JSON.stringify({ content: '这一行把单价乘数量算总价。' }) }, token);
    results.push('保存理解');
    const practice = await request('/api/learning/sessions/' + sid + '/lines/1/practice', { method: 'POST', body: JSON.stringify({ practiceType: 'restate', question: '复述这一行', userAnswer: '把商品数量乘单价得到总价。' }) }, token);
    results.push('保存练习');
    const category = await request('/api/learning/categories', { method: 'POST', body: JSON.stringify({ name: '重点项目', color: '#f43f5e' }) }, token);
    await request('/api/learning/sessions/' + sid + '/category', { method: 'PUT', body: JSON.stringify({ categoryId: category.category.id }) }, token);
    results.push('分类修改');
    const mistake = await request('/api/mistakes', { method: 'POST', body: JSON.stringify({ sessionId: sid, itemType: 'line', startLine: 1, endLine: 1, title: '第1行', codeSnippet: 'const total = price * count;', question: '为什么乘？', note: '再看变量含义' }) }, token);
    results.push('加入错题');
    await request('/api/mistakes/' + mistake.mistake.id + '/review-result', { method: 'POST', body: JSON.stringify({ correct: false }) }, token);
    results.push('开始复习');
    const histories = await request('/api/learning/sessions', {}, token);
    results.push('历史读取:' + histories.sessions.length);
    await request('/api/me/account', { method: 'DELETE', body: JSON.stringify({ password }) }, token);
    results.push('注销');
    await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });
    results.push('注销后重新注册');
    process.stdout.write(JSON.stringify({ ok: true, username, results, aiCalls: received.length, serverErr }, null, 2));
  } catch (error) {
    process.stdout.write(JSON.stringify({ ok: false, username, results, error: error.message, aiCalls: received.length, serverErr }, null, 2));
    process.exitCode = 1;
  } finally {
    child.kill();
    fakeAI.close();
  }
});

const guard = setTimeout(() => { process.exit(2); }, 30000);
guard.unref();
