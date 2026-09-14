const { callAI, callAIJson } = require('./ai');
const {
  snippetMessages,
  projectMapMessages,
  projectDeepMessages,
  errorMessages,
  urlMessages,
  annotateMessages,
  lineInsightMessages,
  lineQuestionMessages,
  understandingReviewMessages,
  practiceReviewMessages
} = require('./prompts');

function totalLines(files) {
  return files.reduce((sum, file) => sum + file.content.split('\n').length, 0);
}

function chunkFiles(files, maxFiles = 5, maxLines = 800) {
  const chunks = [];
  let current = [];
  let currentLines = 0;

  for (const file of files) {
    const lines = file.content.split('\n').length;
    if (current.length >= maxFiles || (currentLines + lines > maxLines && current.length > 0)) {
      chunks.push(current);
      current = [];
      currentLines = 0;
    }
    current.push(file);
    currentLines += lines;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function analyzeSnippet(keyRecord, code, language, style) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    snippetMessages(code, language, style),
    0.2
  );
}

async function analyzeError(keyRecord, code, log) {
  return callAI(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    errorMessages(code, log)
  );
}

async function analyzeUrl(keyRecord, url, pageInfo) {
  return callAI(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    urlMessages(url, pageInfo)
  );
}

async function annotateCode(keyRecord, code, language) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    annotateMessages(code, language),
    0.1
  );
}

async function analyzeProject(keyRecord, files, focus) {
  const lines = totalLines(files);
  const shouldBatch = files.length > 5 || lines > 1000;

  if (!shouldBatch) {
    return callAI(
      keyRecord.key,
      keyRecord.provider,
      keyRecord.baseUrl,
      keyRecord.model,
      projectDeepMessages(files, 1, 1, focus)
    );
  }

  const parts = [];
  const mapReport = await callAI(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    projectMapMessages(files, focus)
  );
  parts.push(mapReport);

  const chunks = chunkFiles(files);
  for (let i = 0; i < chunks.length; i += 1) {
    const deepReport = await callAI(
      keyRecord.key,
      keyRecord.provider,
      keyRecord.baseUrl,
      keyRecord.model,
      projectDeepMessages(chunks[i], i + 1, chunks.length, focus)
    );
    parts.push(`\n\n## 第 ${i + 1} / ${chunks.length} 批深入分析\n\n${deepReport}`);
  }

  return parts.join('\n\n');
}

async function explainLine(keyRecord, payload) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    lineInsightMessages(payload),
    0.1
  );
}

async function answerLineQuestion(keyRecord, payload) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    lineQuestionMessages(payload),
    0.1
  );
}

async function reviewUnderstanding(keyRecord, payload) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    understandingReviewMessages(payload),
    0.1
  );
}

async function reviewPractice(keyRecord, payload) {
  return callAIJson(
    keyRecord.key,
    keyRecord.provider,
    keyRecord.baseUrl,
    keyRecord.model,
    practiceReviewMessages(payload),
    0.1
  );
}

module.exports = {
  analyzeSnippet,
  analyzeError,
  analyzeUrl,
  annotateCode,
  analyzeProject,
  explainLine,
  answerLineQuestion,
  reviewUnderstanding,
  reviewPractice,
  chunkFiles,
  totalLines
};
