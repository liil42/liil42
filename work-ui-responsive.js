const http = require('http');
const { spawn } = require('child_process');

function fake(res, content) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }));
}
const aiPort = 3299;
const fakeAI = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    const p = JSON.parse(body || '{}');
    const sys = String(p.messages?.[0]?.content || '');
    if (sys.includes('片段')) return fake(res, { explanation: '这一行把单价和数量相乘，得到总价。', file: '响应式测试', confidence: '高', risk_level: '低', risk_reason: '没有明显风险。', alternative_code: 'const total = price * count;' });
    if (sys.includes('逐行')) return fake(res, { plain_explanation: '先读取单价和数量，再相乘赋给总量。', analogy: '像把单价和数量交给收银员。', tokens: [{ text: 'price', meaning: '单价' }, { text: 'count', meaning: '数量' }], execution_before: '已有两个变量。', execution_after: '得到总量。', why_here: '完成计算。', if_wrong: '变量写错会失败。', must_know: ['乘法计算总价。'] });
    return fake(res, { explanation: '测试结果。', confidence: '高' });
  });
});

(() => {})()

async function main() {
  await new Promise(r => fakeAI.listen(aiPort, '127.0.0.1', r));
  const child = spawn(process.execPath, ['server/src/index.js'], { cwd: 'F:/AI-codex/daimaxuexi', env: { ...process.env, PORT: '3301', LEARNING_DB_PATH: 'F:/AI-codex/daimaxuexi/data/ui-responsive.db' }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise(r => setTimeout(r, 1200));
    const base = 'http://127.0.0.1:3301';
  const uname = 'RESP' + Date.now();
  const pwd = 'test123456';
  async function req(path, options = {}, token = '') {
    const r = await fetch(base + path, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
    const d = await r.json(); if (!r.ok) throw new Error(JSON.stringify(d)); return d;
  }
  try {
    const reg = await req('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: uname, password: pwd }) });
    await req('/api/settings/apikey', { method: 'POST', body: JSON.stringify({ provider: 'custom', apiKey: 'x', baseUrl: 'http://127.0.0.1:' + aiPort + '/v1', model: 'x' }) }, reg.token);
    await req('/api/analyze/snippet', { method: 'POST', body: JSON.stringify({ code: 'const total = price * count;' }) }, reg.token);
    process.stdout.write(JSON.stringify({ ok: true, uname, pwd }, null, 2));
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, error: e.message }, null, 2));
    process.exitCode = 1;
  } finally {
    child.kill();
    fakeAI.close();
  }
}
main();
