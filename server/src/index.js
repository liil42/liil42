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
  activateMembership,
  verifyPassword,
  saveApiKey,
  getApiKeyRecord,
  createMembershipCodes,
  redeemMembership,
  todayRunCount,
  recordRun,
  listHistory,
  getHistoryItem,
  deleteHistoryItem,
  deleteUserData
} = require('./store');
const { encrypt, maskKey } = require('./crypto');
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
app.use(cors());
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
    const error = new Error('今日非会员次数已用完，请明天再试或激活会员');
    error.status = 429;
    error.code = 'QUOTA_EXCEEDED';
    throw error;
  }
}

function publicUser(user) {
  const keyRecord = getApiKeyRecord(user.id);
  return {
    id: user.id,
    username: user.username,
    isMember: isUserMember(user.id),
    apiKey: keyRecord ? maskKey(keyRecord.key) : '',
    provider: keyRecord ? keyRecord.provider : '',
    model: keyRecord ? keyRecord.model : '',
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

app.post('/api/membership/redeem', requireAuth, (req, res, next) => {
  return fail(res, 403, '会员支付功能尚未开放', 'PAYMENT_DISABLED');
  // eslint-disable-next-line no-unreachable
  try {
    const code = String((req.body || {}).code || '').trim();
    const result = redeemMembership(req.user.id, code);
    if (!result.ok) return fail(res, 400, result.message);
    return res.json({ user: publicUser(result.user) });
  } catch (error) {
    return next(error);
  }
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

app.post('/api/admin/codes', (req, res, next) => {
  try {
    const token = req.headers['x-admin-token'] || '';
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return fail(res, 403, '管理令牌错误');
    }
    const count = Math.min(parseInt(req.body?.count || '1', 10) || 1, 100);
    return res.json({ codes: createMembershipCodes(count) });
  } catch (error) {
    return next(error);
  }
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
    if (files.length === 0 || files.length > 200) {
      return fail(res, 400, '项目文件数量需为 1 到 200 个');
    }
    const totalChars = files.reduce((sum, file) => sum + String(file.content || '').length, 0);
    if (totalChars > 8 * 1024 * 1024) {
      return fail(res, 400, '项目总大小不能超过 8MB');
    }
    const normalized = files.map((file) => ({
      path: String(file.path || '未命名文件'),
      content: String(file.content || '')
    }));
    assertQuota(req);
    const keyRecord = requireApiKey(req);
    const report = await analyzeProject(keyRecord, normalized, focus);
    recordRun(
      req.user.id,
      'project',
      normalized[0].path,
      report
    );
    return res.json({
      report,
      fileCount: normalized.length,
      totalLines: totalLines(normalized)
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/analyze/error', requireAuth, async (req, res, next) => {
  try {
    const { code, log } = req.body || {};
    if (!code || !log) return fail(res, 400, '代码和报错日志都不能为空');
    assertQuota(req);
    const keyRecord = requireApiKey(req);
    const report = await analyzeError(keyRecord, String(code), String(log));
    recordRun(req.user.id, 'error', '报错反向推导', report);
    return res.json({ report });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/analyze/url', requireAuth, async (req, res, next) => {
  try {
    const inputUrl = String(req.body?.url || '').trim();
    const parsed = new URL(inputUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return fail(res, 400, '只支持 http 或 https 地址');
    }
    assertQuota(req);
    const keyRecord = requireApiKey(req);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const response = await fetch(inputUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 code-mentor-web' }
    });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`网页请求失败：${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();
    const content = raw.length > 800000 ? raw.slice(0, 800000) : raw;
    const report = await analyzeUrl(keyRecord, inputUrl, { contentType, content });
    recordRun(req.user.id, 'url', inputUrl, report);
    return res.json({ report, contentType });
  } catch (error) {
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
  res.status(status).json({ success: false, error: { code: error.code || 'REQUEST_FAILED', message }, message });
});

const port = process.env.PORT || 3002;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`后端服务已启动：http://localhost:${port}`);
  });
}

module.exports = app;
