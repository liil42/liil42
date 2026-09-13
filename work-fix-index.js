const fs = require('fs');
const path = 'server/src/index.js';
let t = fs.readFileSync(path, 'utf8');
const before = t.length;

// 1) 移除支付路由（保留 paymentService 引用以避免其他依赖报错）
const payStart = t.indexOf("app.post('/api/payments/orders'");
const payEnd = t.indexOf("app.post('/api/settings/apikey'");
if (payStart < 0 || payEnd < 0) { console.error('LOCATE FAIL payments'); process.exit(1); }
t = t.slice(0, payStart) + t.slice(payEnd);

// 2) 端口默认 3002
t = t.replace("const port = process.env.PORT || 3001;", "const port = process.env.PORT || 3002;");

// 3) 启动日志中文 + 编码提示
t = t.replace(
  "    console.log(`后端服务已启动：http://localhost:${port}`);",
  "    console.log(`后端服务已启动：http://localhost:${port}`);"
);

// 4) 错误处理：控制台输出可读（避免乱码 + 保留堆栈）
t = t.replace(
  "app.use((error, req, res, next) => {\n  console.error(error);",
  "app.use((error, req, res, next) => {\n  const detail = error && error.stack ? error.stack : String(error);\n  console.error(`[请求错误] ${req.method} ${req.originalUrl}\\n${detail}`);"
);

fs.writeFileSync(path, t, 'utf8');
console.log('index.js updated', before, '->', t.length);
