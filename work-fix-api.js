const fs = require('fs');
const path = 'client/src/api.js';
const content = `const TOKEN_KEY = 'daimaxuexi_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function buildNetworkError(cause) {
  const error = new Error('无法连接后端服务，请确认 3002 端口已经启动');
  error.status = 0;
  error.code = 'BACKEND_DOWN';
  error.cause = cause;
  return error;
}

function messageFromBody(data, status) {
  if (data && data.error && data.error.message) return data.error.message;
  if (data && data.message) return data.message;
  if (status === 401) return '登录状态已失效，请重新登录';
  if (status === 403) return '当前账号没有权限执行此操作';
  if (status === 404) return '请求的内容不存在';
  if (status === 429) return '请求过于频繁，请稍后再试';
  if (status >= 500) return '服务暂时不可用，请稍后重试';
  return '请求处理失败，请稍后重试';
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
    ...(options.headers || {})
  };

  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch (error) {
    throw buildNetworkError(error);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(messageFromBody(data, response.status));
    error.status = response.status;
    error.code = (data && data.error && data.error.code) || 'REQUEST_FAILED';
    throw error;
  }
  return data;
}
`;
fs.writeFileSync(path, content, 'utf8');
console.log('api.js rewritten');
