const fs = require('fs');
const path = 'server/src/errors.js';
const content = `const CODE_MESSAGES = {
  400: '请求参数有误，请检查后重试',
  401: '登录状态已失效，请重新登录',
  403: '当前账号没有权限执行此操作',
  404: '请求的内容不存在',
  409: '数据已存在或状态冲突',
  429: '请求过于频繁，请稍后再试'
};

const RAW_CODE_HINTS = [
  { pattern: /api key|apikey|API Key/i, status: 400, message: '请先在设置中填写 API Key' },
  { pattern: /ENOENT|SQLITE|database|file/i, status: 500, message: '数据读写失败，请稍后重试' },
  { pattern: /fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket|network|UND_ERR/i, status: 502, message: '无法连接外部服务，请检查网络后重试' },
  { pattern: /aborted|timeout|timed out/i, status: 504, message: '服务响应超时，请稍后重试' },
  { pattern: /429|rate limit|too many/i, status: 429, message: '请求过于频繁，请稍后再试' }
];

function isFriendlyChineseMessage(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (/^AI\\b/.test(text) && /请/.test(text)) return true;
  const chinese = (text.match(/[\\u4e00-\\u9fff]/g) || []).length;
  if (chinese < 2) return false;
  // 中文友好提示里可能包含 API Key、baseUrl 等必要英文词，但不应包含堆栈或大段英文
  if (/at\\s+\\S+\\s+\\(|Error:|\\/api\\/|node_modules/.test(text)) return false;
  const latinWords = text.match(/[A-Za-z]{6,}/g) || [];
  return latinWords.length <= 1;
}

function publicErrorMessage(error) {
  const status = Number(error && error.status) || 500;
  const original = error && error.message ? String(error.message) : '';

  if (isFriendlyChineseMessage(original)) return original;

  for (const hint of RAW_CODE_HINTS) {
    if (hint.pattern.test(original)) return hint.message;
  }

  if (CODE_MESSAGES[status]) return CODE_MESSAGES[status];
  if (status >= 500) return '服务暂时不可用，请稍后重试';
  return '请求处理失败，请稍后重试';
}

module.exports = { publicErrorMessage, isFriendlyChineseMessage, CODE_MESSAGES };
`;
fs.writeFileSync(path, content, 'utf8');
console.log('errors.js rewritten');
