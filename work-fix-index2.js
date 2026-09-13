const fs = require('fs');
let t = fs.readFileSync('server/src/index.js', 'utf8');
// 关键接口错误码改为规范 JSON 结构，并确保未配置 API Key 的提示为可操作中文
t = t.replace(
  "    const error = new Error('请先在设置中填写 API Key');\n    error.status = 400;\n    throw error;",
  "    const error = new Error('请先在设置中填写 API Key');\n    error.status = 400;\n    error.code = 'API_KEY_REQUIRED';\n    throw error;"
);
t = t.replace(
  "  if (todayRunCount(req.user.id) >= 3) {\n    const error = new Error('今日非会员次数已用完，请明天再试或激活会员');\n    error.status = 429;\n    throw error;\n  }",
  "  if (todayRunCount(req.user.id) >= 3) {\n    const error = new Error('今日非会员次数已用完，请明天再试或激活会员');\n    error.status = 429;\n    error.code = 'QUOTA_EXCEEDED';\n    throw error;\n  }"
);
fs.writeFileSync('server/src/index.js', t, 'utf8');
console.log('quota/apikey codes added');
