// Windows 控制台默认 GBK，会导致中文日志乱码；这里统一切到 UTF-8 输出
if (process.platform === 'win32' && process.stdout && process.stdout.isTTY) {
  try {
    require('child_process').execSync('chcp 65001', { stdio: 'ignore' });
  } catch (error) {
    // 切换失败时忽略，不影响服务启动
  }
}

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const {
  createUser,
  findUserByUsername,
  getUserById,
  isUserMember,
  verifyPassword,
  saveApiKey,
  getApiKeyRecord,
  todayRunCount,
  recordRun,
  listHistory,
  getHistoryItem,
  deleteHistoryItem,
  deleteUserData
} = require('./store');
const { encrypt, maskKey } = require('./crypto');
const { callAI, friendlyError } = require('./ai');
const {
  analyzeSnippet,
  analyzeError,
  analyzeUrl,
  annotateCode,
  analyzeProject,
  explainLine,
  answerLineQuestion,
  reviewUnderstanding,
  reviewPractice,
  totalLines
} = require('./analyzer');
const { fetchGitHubProject } = require('./github');
const { publicErrorMessage } = require('./errors');
const { learningStore } = require('./learning-store');

const app = express();
function buildCorsOrigin() {
  const configured = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const defaults = [
    'https://liil42.github.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];
  return [...new Set([...defaults, ...configured])];
}

const allowedOrigins = buildCorsOrigin();
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json({ limit: '30mb' }));

function ok(res, data, status = 200) {
  const payload = data && typeof data === 'object' && !Array.isArray(data) ? data : { data };
  return res.status(status).json({ success: true, ...payload });
}

function fail(res, status, message, code) {
  return res.status(status).json({ success: false, error: { code: code || 'REQUEST_FAILED', message } });
}

function sign(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return fail(res, 401, '请先登录', 'UNAUTHORIZED');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = getUserById(payload.sub);
    if (!user) return fail(res, 401, '账号不存在', 'ACCOUNT_NOT_FOUND');
    req.user = user;
    return next();
  } catch (error) {
    return fail(res, 401, '登录已过期，请重新登录', 'TOKEN_EXPIRED');
  }
}

function requireApiKey(req) {
  const keyRecord = getApiKeyRecord(req.user.id);
  if (!keyRecord) {
    const error = new Error('请先在设置中填写 API Key');
    error.status = 400;
    error.code = 'API_KEY_REQUIRED';
    throw error;
  }
  return keyRecord;
}

function assertQuota(req) {
  if (isUserMember(req.user.id)) return;
  if (todayRunCount(req.user.id) >= 3) {
    const error = new Error('今日体验次数已用完，请明天再试');
    error.status = 429;
    error.code = 'QUOTA_EXCEEDED';
    throw error;
  }
}

function publicUser(user) {
  const keyRecord = getApiKeyRecord(user.id, { allowInvalid: true });
  const apiKeyInvalid = Boolean(keyRecord && keyRecord.invalid);
  return {
    id: user.id,
    username: user.username,
    isMember: isUserMember(user.id),
    apiKey: keyRecord && !apiKeyInvalid ? maskKey(keyRecord.key) : '',
    provider: keyRecord ? keyRecord.provider : '',
    model: keyRecord ? keyRecord.model : '',
    apiKeyInvalid,
    apiKeyMessage: apiKeyInvalid ? '之前保存的 API Key 已失效，请在设置中重新填写' : '',
    todayUsed: todayRunCount(user.id)
  };
}

app.post('/api/auth/register', (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/.test(username || '')) {
      return fail(res, 400, '用户名需为 2 到 20 位中文、字母、数字或下划线');
    }
    if (!password || password.length < 6 || password.length > 64) {
      return fail(res, 400, '密码长度需为 6 到 64 位');
    }
    if (findUserByUsername(username)) {
      return fail(res, 409, '用户名已存在');
    }
    const user = createUser(username, password);
    return res.json({ token: sign(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/login', (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    const user = findUserByUsername(username || '');
    if (!user || !verifyPassword(user, password || '')) {
      return fail(res, 401, '用户名或密码错误');
    }
    return res.json({ token: sign(user), user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post('/api/settings/apikey', requireAuth, (req, res, next) => {
  try {
    const { provider, apiKey, baseUrl, model } = req.body || {};
    if (!['deepseek', 'openai', 'custom'].includes(provider)) {
      return fail(res, 400, '请选择模型服务商');
    }
    if (!apiKey || !String(apiKey).trim()) {
      return fail(res, 400, 'API Key 不能为空');
    }
    if (provider === 'custom' && !baseUrl) {
      return fail(res, 400, '自定义接口必须填写 baseUrl');
    }
    saveApiKey(req.user.id, provider, encrypt(String(apiKey).trim()), baseUrl || '', model || '');
    return res.json({ user: publicUser(req.user) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/settings/test-connection', requireAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const saved = getApiKeyRecord(req.user.id, { allowInvalid: true });
    const provider = String(payload.provider || (saved && saved.provider) || 'deepseek');
    const apiKey = String(payload.apiKey || (saved && saved.key) || '').trim();
    const baseUrl = String(payload.baseUrl || (saved && saved.baseUrl) || '');
    const model = String(payload.model || (saved && saved.model) || '');
    if (!apiKey) {
      return fail(res, 400, '请先填写 API Key，再测试连接', 'API_KEY_REQUIRED');
    }
    if (!['deepseek', 'openai', 'custom'].includes(provider)) {
      return fail(res, 400, '请先选择模型服务商', 'INVALID_PROVIDER');
    }
    const content = await callAI(
      apiKey,
      provider,
      baseUrl,
      model,
      [
        { role: 'system', content: '你只需要回复：连接成功。' },
        { role: 'user', content: '请测试当前 API Key、接口地址和模型名称是否可用。' }
      ],
      0,
      false
    );
    return res.json({
      message: '连接成功，API Key、接口地址和模型都可以使用。',
      reply: String(content || '').slice(0, 80)
    });
  } catch (error) {
    const reason = friendlyError(error);
    console.error('[测试连接失败] ' + reason + ' | 原始错误: ' + String((error && error.message) || error));
    return res.status(400).json({
      success: false,
      error: { code: 'AI_CONNECTION_FAILED', message: reason },
      message: reason
    });
  }
});
app.delete('/api/me/data', requireAuth, (req, res, next) => {
  try {
    deleteUserData(req.user.id);
    learningStore.deleteUserData(req.user.id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/me/account', requireAuth, (req, res, next) => {
  try {
    const password = String(req.body?.password || '');
    if (!password) return fail(res, 400, '请输入当前密码确认注销');
    if (!verifyPassword(req.user, password)) {
      return fail(res, 401, '密码错误，账号未注销');
    }
    learningStore.deleteUserData(req.user.id);
    deleteUserData(req.user.id);
    return res.json({ ok: true, message: '账号已注销，用户名可以重新注册' });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/history', requireAuth, (req, res) => {
  res.json({ history: listHistory(req.user.id) });
});

app.get('/api/learning/history', requireAuth, (req, res, next) => {
  try {
    const sessions = learningStore.listSessionSummaries(req.user.id);
    const byRunId = new Map(sessions.map((item) => [item.analysisRunId, item]));
    const legacy = listHistory(req.user.id).map((item) => ({
      ...item,
      session_id: byRunId.get(item.id)?.id || null,
      category_id: byRunId.get(item.id)?.categoryId || null,
      category_name: byRunId.get(item.id)?.categoryName || null
    }));
    return res.json({ history: legacy, sessions });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/history/:id', requireAuth, (req, res) => {
  const item = getHistoryItem(req.user.id, req.params.id);
  if (!item) return fail(res, 404, '记录不存在');
  res.json({ item });
});

app.delete('/api/history/:id', requireAuth, (req, res) => {
  deleteHistoryItem(req.user.id, req.params.id);
  res.json({ ok: true });
});

app.post('/api/analyze/snippet', requireAuth, async (req, res, next) => {
  try {
    const { code, language, style } = req.body || {};
    if (!code || String(code).length > 200000) {
      return fail(res, 400, '代码不能为空且不能超过 200KB');
    }
    assertQuota(req);
    const keyRecord = requireApiKey(req);
    const result = await analyzeSnippet(keyRecord, String(code), language || '', style || '');
    const analysisRunId = recordRun(req.user.id, 'snippet', language || '代码片段', JSON.stringify(result));
    const session = learningStore.createSession({
      userId: req.user.id,
      analysisRunId,
      sourceType: 'snippet',
      fileName: result.file || '粘贴代码',
      language: language || '',
      code: String(code),
      analysis: result
    });
    return res.json({ ...result, learning_session_id: session.id });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/learning/sessions/:id', requireAuth, (req, res, next) => {
  try {
    const session = learningStore.getSession(req.user.id, req.params.id);
    if (!session) return fail(res, 404, '学习记录不存在');
    return res.json({ session });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/learning/sessions', requireAuth, (req, res, next) => {
  try {
    return res.json({ sessions: learningStore.listSessionSummaries(req.user.id) });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/learning/sessions/:id/category', requireAuth, (req, res, next) => {
  try {
    const session = learningStore.assignSessionCategory(
      req.user.id,
      req.params.id,
      req.body?.categoryId || null
    );
    if (!session) return fail(res, 404, '学习记录或分类不存在');
    return res.json({ session });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/learning/categories', requireAuth, (req, res, next) => {
  try {
    return res.json({ categories: learningStore.listCategories(req.user.id) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/learning/categories', requireAuth, (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 20) {
      return fail(res, 400, '分类名称需为 1 到 20 个字');
    }
    const color = String(req.body?.color || '#38bdf8').trim();
    const category = learningStore.createCategory(req.user.id, name, color);
    return res.status(201).json({ category });
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed')) {
      return fail(res, 409, '该分类名称已经存在');
    }
    return next(error);
  }
});

app.put('/api/learning/categories/:id', requireAuth, (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 20) {
      return fail(res, 400, '分类名称需为 1 到 20 个字');
    }
    const category = learningStore.updateCategory(req.user.id, req.params.id, {
      name,
      color: String(req.body?.color || '#38bdf8').trim()
    });
    if (!category) return fail(res, 404, '分类不存在');
    return res.json({ category });
  } catch (error) {
    if (String(error.message).includes('UNIQUE constraint failed')) {
      return fail(res, 409, '该分类名称已经存在');
    }
    return next(error);
  }
});

app.delete('/api/learning/categories/:id', requireAuth, (req, res, next) => {
  try {
    const deleted = learningStore.deleteCategory(req.user.id, req.params.id);
    if (!deleted) return fail(res, 404, '分类不存在');
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/mistakes', requireAuth, (req, res, next) => {
  try {
    const status = String(req.query.status || '');
    if (status === 'due') {
      return res.json({ mistakes: learningStore.listDueMistakes(req.user.id) });
    }
    const mistakes = learningStore.listMistakes(req.user.id, {
      status,
      categoryId: req.query.categoryId || '',
      itemType: req.query.itemType || ''
    });
    return res.json({ mistakes });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/mistakes', requireAuth, (req, res, next) => {
  try {
    const {
      sessionId,
      categoryId,
      itemType,
      startLine,
      endLine,
      title,
      codeSnippet,
      question,
      note
    } = req.body || {};
    const session = learningStore.getSessionForLearning(req.user.id, String(sessionId || ''));
    if (!session) return fail(res, 404, '学习记录不存在');
    if (!['line', 'function'].includes(itemType)) {
      return fail(res, 400, '错题类型只能是代码行或函数');
    }
    const start = Number.parseInt(startLine, 10);
    const end = Number.parseInt(endLine, 10);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      return fail(res, 400, '行号范围不正确');
    }
    const normalizedQuestion = String(question || '').trim();
    if (!normalizedQuestion) return fail(res, 400, '请写下不懂的问题');
    const mistake = learningStore.addMistake({
      userId: req.user.id,
      sessionId: session.id,
      categoryId: categoryId || null,
      itemType,
      startLine: start,
      endLine: end,
      title: String(title || '').trim() || (itemType === 'line' ? `第 ${start} 行` : `第 ${start}-${end} 行函数`),
      codeSnippet: String(codeSnippet || '').slice(0, 30000),
      question: normalizedQuestion.slice(0, 4000),
      note: String(note || '').slice(0, 4000)
    });
    return res.status(201).json({ mistake });
  } catch (error) {
    return next(error);
  }
});

app.put('/api/mistakes/:id', requireAuth, (req, res, next) => {
  try {
    const mistake = learningStore.updateMistake(req.user.id, req.params.id, req.body || {});
    if (!mistake) return fail(res, 404, '错题不存在');
    return res.json({ mistake });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/mistakes/:id/review', requireAuth, (req, res, next) => {
  try {
    const mistake = learningStore.reviewMistake(req.user.id, req.params.id);
    if (!mistake) return fail(res, 404, '错题不存在');
    return res.json({ mistake });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/mistakes/:id', requireAuth, (req, res, next) => {
  try {
    const deleted = learningStore.deleteMistake(req.user.id, req.params.id);
    if (!deleted) return fail(res, 404, '错题不存在');
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/learning/sessions/:id/lines/:lineNumber/explain', requireAuth, async (req, res, next) => {
  try {
    const session = learningStore.getSessionForLearning(req.user.id, req.params.id);
    if (!session) return fail(res, 404, '学习记录不存在');

    const lineNumber = Number.parseInt(req.params.lineNumber, 10);
    const lines = String(session.code || '').split(/\r?\n/);
    if (!Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > lines.length) {
      return fail(res, 400, '行号超出代码范围');
    }

    const existing = learningStore.getInsight(req.user.id, session.id, lineNumber);
    if (existing) return res.json({ insight: existing, cached: true });

    const keyRecord = requireApiKey(req);
    const lineText = lines[lineNumber - 1] || '';
    const contextStart = Math.max(0, lineNumber - 6);
    const contextEnd = Math.min(lines.length, lineNumber + 5);
    const contextLines = lines
      .slice(contextStart, contextEnd)
      .map((text, index) => `${contextStart + index + 1}: ${text}`)
      .join('\n');
    const insightData = await explainLine(keyRecord, {
      code: session.code,
      language: session.language,
      lineNumber,
      lineText,
      contextLines,
      analysis: JSON.parse(session.analysis_json)
    });
    const insight = learningStore.upsertInsight({
      userId: req.user.id,
      sessionId: session.id,
      lineNumber,
      lineText,
      insight: insightData
    });
    return res.json({ insight, cached: false });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/learning/sessions/:id/lines/:lineNumber/questions', requireAuth, async (req, res, next) => {
  try {
    const session = learningStore.getSessionForLearning(req.user.id, req.params.id);
    if (!session) return fail(res, 404, '学习记录不存在');

    const lineNumber = Number.parseInt(req.params.lineNumber, 10);
    const lines = String(session.code || '').split(/\r?\n/);
    if (!Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > lines.length) {
      return fail(res, 400, '行号超出代码范围');
    }
    const question = String(req.body?.question || '').trim();
    if (!question) return fail(res, 400, '追问内容不能为空');
    if (question.length > 2000) return fail(res, 400, '追问不能超过 2000 字');

    const keyRecord = requireApiKey(req);
    const insight = learningStore.getInsight(req.user.id, session.id, lineNumber);
    const answer = await answerLineQuestion(keyRecord, {
      code: session.code,
      language: session.language,
      lineNumber,
      lineText: lines[lineNumber - 1] || '',
      insight: insight?.insight || {},
      question
    });
    const record = learningStore.addQuestion({
      userId: req.user.id,
      sessionId: session.id,
      insightId: insight?.id || null,
      lineNumber,
      question,
      answer
    });
    return res.json({ question: record });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/learning/sessions/:id/lines/:lineNumber/understandings', requireAuth, async (req, res, next) => {
  try {
    const session = learningStore.getSessionForLearning(req.user.id, req.params.id);
    if (!session) return fail(res, 404, '学习记录不存在');

    const lineNumber = Number.parseInt(req.params.lineNumber, 10);
    const lines = String(session.code || '').split(/\r?\n/);
    if (!Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > lines.length) {
      return fail(res, 400, '行号超出代码范围');
    }
    const content = String(req.body?.content || '').trim();
    if (!content) return fail(res, 400, '自己的理解不能为空');
    if (content.length > 4000) return fail(res, 400, '自己的理解不能超过 4000 字');

    const keyRecord = requireApiKey(req);
    const insight = learningStore.getInsight(req.user.id, session.id, lineNumber);
    const feedback = await reviewUnderstanding(keyRecord, {
      code: session.code,
      language: session.language,
      lineNumber,
      lineText: lines[lineNumber - 1] || '',
      insight: insight?.insight || {},
      understanding: content
    });
    const record = learningStore.addUnderstanding({
      userId: req.user.id,
      sessionId: session.id,
      lineNumber,
      content,
      feedback,
      status: feedback.status || 'needs_revision'
    });
    return res.json({ understanding: record });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/mistakes/:id/review-result', requireAuth, (req, res, next) => {
  try {
    const correct = Boolean(req.body?.correct);
    const record = learningStore.applyReviewResult(req.user.id, req.params.id, correct);
    if (!record) return fail(res, 404, '错题不存在');
    return res.json({ mistake: record, dueCount: learningStore.countDueMistakes(req.user.id) });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/mistakes/due/count', requireAuth, (req, res, next) => {
  try {
    return res.json({
      count: learningStore.countDueMistakes(req.user.id),
      due: learningStore.listDueMistakes(req.user.id)
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/learning/sessions/:id/lines/:lineNumber/practice', requireAuth, async (req, res, next) => {
  try {
    const session = learningStore.getSessionForLearning(req.user.id, req.params.id);
    if (!session) return fail(res, 404, '学习记录不存在');

    const lineNumber = Number.parseInt(req.params.lineNumber, 10);
    const lines = String(session.code || '').split(/\r?\n/);
    if (!Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > lines.length) {
      return fail(res, 400, '行号超出代码范围');
    }

    const practiceType = String(req.body?.practiceType || 'restate');
    const question = String(req.body?.question || '').trim();
    const userAnswer = String(req.body?.userAnswer || '').trim();
    if (!userAnswer) return fail(res, 400, '请先写下你的答案');
    if (userAnswer.length > 4000) return fail(res, 400, '答案不能超过 4000 字');

    const keyRecord = requireApiKey(req);
    const insight = learningStore.getInsight(req.user.id, session.id, lineNumber);
    const feedback = await reviewPractice(keyRecord, {
      code: session.code,
      language: session.language,
      lineNumber,
      lineText: lines[lineNumber - 1] || '',
      practiceType,
      question,
      userAnswer,
      insight: insight?.insight || {}
    });

    const record = learningStore.addPractice({
      userId: req.user.id,
      sessionId: session.id,
      lineNumber,
      practiceType,
      userAnswer,
      feedback,
      result: feedback.correct ? 'correct' : 'needs_revision'
    });

    return res.json({ practice: record, feedback });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/learning/sessions/:id/practice', requireAuth, (req, res, next) => {
  try {
    const session = learningStore.getSession(req.user.id, req.params.id);
    if (!session) return fail(res, 404, '学习记录不存在');
    return res.json({ practice: learningStore.listPractice(req.user.id, session.id) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/analyze/project', requireAuth, async (req, res, next) => {
  try {
    const files = Array.isArray(req.body?.files) ? req.body.files : [];
    const focus = String(req.body?.focus || '');
    const sourceType = String(req.body?.sourceType || 'project');
    if (files.length === 0 || files.length > 200) {
      return fail(res, 400, '请上传 1 到 200 个文件', 'INVALID_FILE_COUNT');
    }
    const totalChars = files.reduce((sum, file) => sum + String(file.content || '').length, 0);
    if (totalChars > 8 * 1024 * 1024) {
      return fail(res, 400, '项目内容不能超过 8MB', 'PROJECT_TOO_LARGE');
    }
    const normalized = files.map((file) => ({
      path: String(file.path || '未命名文件'),
      content: String(file.content || '')
    }));
    assertQuota(req);
    const keyRecord = requireApiKey(req);
    const report = await analyzeProject(keyRecord, normalized, focus);
    const title = String(req.body?.title || normalized[0].path || '项目');
    const analysisRunId = recordRun(req.user.id, sourceType, title, report);
    const session = learningStore.createSession({
      userId: req.user.id,
      analysisRunId,
      sourceType,
      fileName: title,
      language: '',
      code: normalized.map((item) => `// ${item.path}\n${item.content}`).join('\n\n').slice(0, 120000),
      analysis: { kind: 'report', report, fileCount: normalized.length, totalLines: totalLines(normalized) }
    });
    return res.json({
      report,
      fileCount: normalized.length,
      totalLines: totalLines(normalized),
      learning_session_id: session.id
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/analyze/error', requireAuth, async (req, res, next) => {
  try {
    const code = String(req.body?.code || '');
    const log = String(req.body?.log || '');
    if (!log.trim()) {
      return fail(res, 400, '请先把报错内容粘贴进来；如果能补充相关代码，分析会更准。', 'ERROR_LOG_REQUIRED');
    }
    assertQuota(req);
    const keyRecord = requireApiKey(req);
    const report = await analyzeError(keyRecord, code, log);
    const analysisRunId = recordRun(req.user.id, 'error', '报错日志', report);
    const session = learningStore.createSession({
      userId: req.user.id,
      analysisRunId,
      sourceType: 'error',
      fileName: '报错日志',
      language: '',
      code: code || log,
      analysis: { kind: 'report', report }
    });
    return res.json({ report, learning_session_id: session.id });
  } catch (error) {
    return next(error);
  }
});

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPageInfo(url, rawHtml, contentType) {
  const html = String(rawHtml || '');
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descriptionMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i);
  const headings = [...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((match) => ({ level: Number(match[1]), text: stripHtml(match[2]) }))
    .filter((item) => item.text)
    .slice(0, 30);
  const codeBlocks = [...html.matchAll(/<(pre|code)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => stripHtml(match[2]))
    .filter(Boolean)
    .slice(0, 12);
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ href: match[1], text: stripHtml(match[2]) }))
    .filter((item) => item.text && !/^javascript:/i.test(item.href))
    .slice(0, 40);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyText = stripHtml(bodyMatch ? bodyMatch[1] : html).slice(0, 24000);
  return {
    url,
    contentType,
    title: stripHtml(titleMatch ? titleMatch[1] : ''),
    description: stripHtml(descriptionMatch ? descriptionMatch[1] : ''),
    headings,
    codeBlocks,
    links,
    bodyText,
    html: html.slice(0, 120000)
  };
}

app.post('/api/analyze/url', requireAuth, async (req, res, next) => {
  try {
    const inputUrl = String(req.body?.url || '').trim();
    let parsed;
    try {
      parsed = new URL(inputUrl);
    } catch (error) {
      return fail(res, 400, '网页地址格式不正确，请输入 http 或 https 开头的网址', 'INVALID_URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return fail(res, 400, '目前只支持 http 或 https 网页地址', 'INVALID_URL_PROTOCOL');
    }
    assertQuota(req);
    const keyRecord = requireApiKey(req);
    const pasted = String(req.body?.pageText || '').trim();
    let raw = pasted;
    let contentType = pasted ? 'text/plain' : '';
    if (!pasted) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await fetch(inputUrl, {
          redirect: 'follow',
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 code-mentor-web' }
        });
        if (response.ok) {
          contentType = response.headers.get('content-type') || '';
          raw = await response.text();
        }
      } catch (error) {
        raw = '';
      } finally {
        clearTimeout(timer);
      }
    }
    if (!raw.trim()) {
      const msg = String.fromCodePoint(0x670D,0x52A1,0x5668,0x6682,0x65F6,0x65E0,0x6CD5,0x8BFB,0x53D6,0x8FD9,0x4E2A,0x7F51,0x9875,0xFF0C,0x8BF7,0x628A,0x7F51,0x9875,0x91CC,0x770B,0x5F97,0x5230,0x7684,0x6587,0x5B57,0x590D,0x5236,0x5230,0x4E0B,0x9762,0x7684,0x201C,0x7F51,0x9875,0x6587,0x5B57,0x201D,0x91CC,0x518D,0x5206,0x6790,0x3002);
      return fail(res, 422, msg, 'PAGE_TEXT_REQUIRED');
    }
    const pageInfo = extractPageInfo(inputUrl, raw, contentType);
    if (/image\//i.test(contentType)) {
      return fail(res, 400, '这个地址不是网页，请换一个普通网页地址', 'NOT_A_WEBPAGE');
    }
    const report = await analyzeUrl(keyRecord, inputUrl, pageInfo);
    const analysisRunId = recordRun(req.user.id, 'url', pageInfo.title || inputUrl, report);
    const session = learningStore.createSession({
      userId: req.user.id,
      analysisRunId,
      sourceType: 'url',
      fileName: pageInfo.title || inputUrl,
      language: '',
      code: [pageInfo.title, pageInfo.description, pageInfo.bodyText].filter(Boolean).join('\n\n'),
      analysis: { kind: 'report', report, pageInfo: { title: pageInfo.title, description: pageInfo.description, url: inputUrl } }
    });
    return res.json({ report, contentType, learning_session_id: session.id, pageTitle: pageInfo.title });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      return fail(res, 504, '打开网页超时了，请稍后重试或换一个地址', 'PAGE_TIMEOUT');
    }
    return next(error);
  }
});

app.post('/api/analyze/github', requireAuth, async (req, res, next) => {
  try {
    const inputUrl = String(req.body?.url || '').trim();
    if (!inputUrl) return fail(res, 400, '请输入 GitHub 地址');
    assertQuota(req);
    const keyRecord = requireApiKey(req);
    const githubData = await fetchGitHubProject(inputUrl);

    if (githubData.single) {
      const result = await analyzeSnippet(
        keyRecord,
        githubData.single.content,
        githubData.single.name,
        ''
      );
      recordRun(req.user.id, 'snippet', githubData.single.name, JSON.stringify(result));
      return res.json({ ...result, source: 'github' });
    }

    const focus = String(req.body?.focus || '');
    const report = await analyzeProject(keyRecord, githubData.files, focus);
    recordRun(req.user.id, 'github', githubData.name, report);
    return res.json({
      report,
      source: 'github',
      fileCount: githubData.files.length,
      totalLines: totalLines(githubData.files)
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/analyze/annotate', requireAuth, async (req, res, next) => {
  try {
    const { code, language, filename } = req.body || {};
    if (!code || String(code).length > 500000) {
      return fail(res, 400, '代码不能为空且不能超过 500KB');
    }
    assertQuota(req);
    const keyRecord = requireApiKey(req);
    const result = await annotateCode(keyRecord, String(code), language || '');
    recordRun(req.user.id, 'annotate', filename || '代码注释版', JSON.stringify(result));
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// API 未匹配的路由统一返回 404 JSON，避免被前端静态页兜底吞掉
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: '接口不存在' },
    message: '接口不存在'
  });
});

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((error, req, res, next) => {
  const detail = error && error.stack ? error.stack : String(error);
  console.error(`[请求错误] ${req.method} ${req.originalUrl}\n${detail}`);
  const status = Number(error && error.status) || 500;
  const message = publicErrorMessage(error);
  const code = error.code || (String(message).startsWith('你的 API Key') || String(message).startsWith('你填的模型') || String(message).startsWith('AI ') || String(message).startsWith('分析超过') || String(message).startsWith('无法连接 AI') || String(message).startsWith('请求太频繁') ? 'AI_CONNECTION_FAILED' : 'REQUEST_FAILED');
  res.status(status).json({ success: false, error: { code, message }, message });
});

const port = process.env.PORT || 3002;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`后端服务已启动：http://localhost:${port}`);
  });
}

module.exports = app;
