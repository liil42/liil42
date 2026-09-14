const DEFAULT_TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 3;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function friendlyError(error) {
  const raw = String((error && error.message) || error || '');
  if (/invalid api key|authentication|unauthorized|invalid_api_key|insufficient|balance|API Key/i.test(raw)) {
    return 'AI 服务鉴权失败，请检查 API Key 是否正确、是否还有余额';
  }
  if (/aborted|timeout|timed out|ETIMEDOUT/i.test(raw)) return 'AI 服务响应超时，请稍后重试';
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket|network|UND_ERR/i.test(raw)) {
    return '无法连接 AI 服务，请检查网络或接口地址';
  }
  if (/429|rate limit|too many/i.test(raw)) return 'AI 服务请求过于频繁，请稍后再试';
  if (/50[0-9]|502|503|504/.test(raw)) return 'AI 服务暂时不可用，请稍后重试';
  if (/JSON|json/i.test(raw)) return 'AI 返回内容格式异常，已自动重试，请再试一次';
  if (/400/.test(raw)) return 'AI 请求参数有误，请检查代码内容后重试';
  return 'AI 服务暂时不可用，请稍后重试';
}
function withStatus(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function buildEndpoint(provider, baseUrl) {
  const defaults = {
    deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }
  };
  const info = defaults[provider] || { baseUrl: '', model: 'deepseek-chat' };
  const endpointBase = (provider === 'custom' && baseUrl) ? baseUrl : info.baseUrl;
  if (!endpointBase) throw withStatus('自定义接口必须填写 baseUrl', 400);
  return { endpoint: `${endpointBase.replace(/\/+$/, '')}/chat/completions`, model: info.model };
}

async function requestOnce(apiKey, endpoint, selectedModel, messages, temperature) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (response.status === 401 || response.status === 403) {
        throw new Error('AI 服务鉴权失败：请检查 API Key 是否正确、是否有余额');
      }
      if (response.status === 429) {
        throw new Error('AI 服务请求过于频繁，请稍后再试');
      }
      if (response.status >= 500) {
        throw new Error('AI 服务暂时不可用，请稍后重试');
      }
      throw new Error(`AI 服务返回 ${response.status}：${text.slice(0, 120)}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI 服务没有返回内容');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

async function callAI(apiKey, provider, baseUrl, model, messages, temperature = 0.2) {
  const { endpoint, model: defaultModel } = buildEndpoint(provider, baseUrl);
  const selectedModel = model || defaultModel;

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await requestOnce(apiKey, endpoint, selectedModel, messages, temperature);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await wait(600 * attempt);
    }
  }
  throw withStatus(friendlyError(lastError), 502);
}

function stripCodeFence(text) {
  return String(text || '')
    .replace(/^\s*```[a-zA-Z]*\s*/g, '')
    .replace(/\s*```\s*$/g, '')
    .trim();
}

function extractBalanced(text, openChar, closeChar) {
  const start = text.indexOf(openChar);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) { inString = false; }
      continue;
    }
    if (ch === '"' || ch === "'") { inString = true; quote = ch; continue; }
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function repairJson(text) {
  let value = stripCodeFence(String(text || ''));
  value = value.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'");
  value = value.replace(/,\s*([}\]])/g, '$1');
  value = value.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
  value = value.replace(/\/\/[^\n\r]*/g, '');
  return value;
}

function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('AI 返回内容为空');

  const candidates = [];
  const fenced = stripCodeFence(raw);
  candidates.push(fenced);
  candidates.push(raw);

  const balancedObj = extractBalanced(fenced, '{', '}');
  if (balancedObj) candidates.push(balancedObj);
  const balancedArr = extractBalanced(fenced, '[', ']');
  if (balancedArr) candidates.push(balancedArr);

  const firstBrace = fenced.indexOf('{');
  const lastBrace = fenced.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(fenced.slice(firstBrace, lastBrace + 1));
  const firstBracket = fenced.indexOf('[');
  const lastBracket = fenced.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) candidates.push(fenced.slice(firstBracket, lastBracket + 1));

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch (error) {
      // 继续尝试下一种候选
    }
    try {
      return JSON.parse(repairJson(candidate));
    } catch (error) {
      // 修复失败，继续尝试下一种候选
    }
  }

  throw new Error('AI 返回内容不是有效 JSON');
}

async function callAIJson(apiKey, provider, baseUrl, model, messages, temperature = 0.1) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const content = await callAI(apiKey, provider, baseUrl, model, messages, temperature);
      return extractJson(content);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await wait(500);
    }
  }
  throw withStatus(friendlyError(lastError), 502);
}

module.exports = { callAI, callAIJson, extractJson, friendlyError };
