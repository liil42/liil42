const fs = require('fs');
const path = 'server/src/index.js';
let t = fs.readFileSync(path, 'utf8');

// 统一成功响应包装：同时保留顶层字段以兼容旧前端
t = t.replace(
  "function sign(user) {",
  `function ok(res, data, status = 200) {
  const payload = data && typeof data === 'object' && !Array.isArray(data) ? data : { data };
  return res.status(status).json({ success: true, ...payload });
}

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, error: { code: code || 'REQUEST_FAILED', message } });
}

function sign(user) {`
);

// 错误处理：统一失败结构，同时保留 message 兼容旧前端
t = t.replace(
  "  const status = Number(error && error.status) || 500;\n  res.status(status).json({ message: publicErrorMessage(error) });",
  "  const status = Number(error && error.status) || 500;\n  const message = publicErrorMessage(error);\n  res.status(status).json({ success: false, error: { code: error.code || 'REQUEST_FAILED', message }, message });"
);

// 401 中间件统一结构
t = t.replace("if (!token) return res.status(401).json({ message: '请先登录' });", "if (!token) return fail(res, 401, '请先登录', 'UNAUTHORIZED');");
t = t.replace("if (!user) return res.status(401).json({ message: '账号不存在' });", "if (!user) return fail(res, 401, '账号不存在', 'ACCOUNT_NOT_FOUND');");
t = t.replace("return res.status(401).json({ message: '登录已过期，请重新登录' });", "return fail(res, 401, '登录已过期，请重新登录', 'TOKEN_EXPIRED');");

fs.writeFileSync(path, t, 'utf8');
console.log('response helpers added');
