const TOKEN_KEY = 'daimaxuexi_token';
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  if (!API_BASE_URL) return path;
  return API_BASE_URL + (path.startsWith('/') ? path : '/' + path);
}

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
  const message = API_BASE_URL
    ? '\u65e0\u6cd5\u8fde\u63a5\u540e\u7aef\u670d\u52a1\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u540e\u91cd\u8bd5'
    : '\u65e0\u6cd5\u8fde\u63a5\u540e\u7aef\u670d\u52a1\uff0c\u8bf7\u786e\u8ba4 3002 \u7aef\u53e3\u5df2\u7ecf\u542f\u52a8';
  const error = new Error(message);
  error.status = 0;
  error.code = 'BACKEND_DOWN';
  error.cause = cause;
  return error;
}

function messageFromBody(data, status) {
  if (data && data.error && data.error.message) return data.error.message;
  if (data && data.message) return data.message;
  if (status === 401) return '\u4f60\u6ca1\u6709\u6743\u9650\u8fdb\u884c\u8fd9\u4e2a\u64cd\u4f5c';
  if (status === 403) return '\u4f60\u6ca1\u6709\u6743\u9650\u8fdb\u884c\u8fd9\u4e2a\u64cd\u4f5c';
  if (status === 404) return '\u6ca1\u6709\u627e\u5230\u8981\u8bbf\u95ee\u7684\u5185\u5bb9';
  if (status === 429) return '\u8bf7\u6c42\u5904\u7406\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
  if (status >= 500) return '\u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
  return '\u8bf7\u6c42\u5904\u7406\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  let response;
  try {
    response = await fetch(apiUrl(path), { ...options, headers });
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
