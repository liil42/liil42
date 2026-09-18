import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Code2,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Save,
  Send,
  ShieldAlert,
  X
} from 'lucide-react';
import { api } from '../api';
import HighlightedText from './HighlightedText';

function CodePreview({ code }) {
  if (!code) return null;
  return (
    <div className="snippet-section">
      <div className="section-title"><Code2 size={16} />优化代码</div>
      <pre className="code-block">{code}</pre>
    </div>
  );
}

function InsightBody({ insight, noviceMode = true }) {
  const [showDetails, setShowDetails] = useState(false);
  if (!insight) return null;
  const advanced = !noviceMode;
  const detailsOpen = advanced || showDetails;
  return (
    <div className="line-insight">
      <div className="line-insight-block">
        <strong>这一行在做什么</strong>
        <p><HighlightedText text={insight.plain_explanation} /></p>
      </div>
      {insight.analogy && (
        <div className="line-insight-block insight-analogy">
          <strong>换个说法</strong>
          <p><HighlightedText text={insight.analogy} /></p>
        </div>
      )}
      {Array.isArray(insight.tokens) && insight.tokens.length > 0 && (
        <div className="line-insight-block">
          <strong>逐个看懂</strong>
          <div className="token-list">
            {insight.tokens.map((token, index) => (
              <div className="token-item" key={`${token.text}-${index}`}>
                <code>{token.text}</code>
                <span><HighlightedText text={token.meaning} /></span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!advanced && (
        <button
          type="button"
          className="details-toggle"
          onClick={() => setShowDetails((current) => !current)}
        >
          {showDetails ? '收起更多细节' : '展开更多细节'}
        </button>
      )}
      {detailsOpen && (
        <>
          <div className="execution-grid">
            {insight.execution_before && (
              <div><span>执行前</span><p><HighlightedText text={insight.execution_before} /></p></div>
            )}
            {insight.execution_after && (
              <div><span>执行后</span><p><HighlightedText text={insight.execution_after} /></p></div>
            )}
          </div>
          {insight.why_here && (
            <div className="line-insight-block">
              <strong>为什么放在这里</strong>
              <p><HighlightedText text={insight.why_here} /></p>
            </div>
          )}
          {insight.if_wrong && (
            <div className="line-insight-block">
              <strong>写错会怎样</strong>
              <p><HighlightedText text={insight.if_wrong} /></p>
            </div>
          )}
          {Array.isArray(insight.must_know) && insight.must_know.length > 0 && (
            <div className="line-insight-block must-know">
              <strong>必须记住</strong>
              <ul>
                {insight.must_know.map((item, index) => (
                  <li key={index}><HighlightedText text={item} /></li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function practiceQuestionText(type, lineNumber) {
  if (type === 'predict') return `预测第 ${lineNumber} 行执行后会发生什么？`;
  if (type === 'change') return `如果把第 ${lineNumber} 行里的一个变量改掉，会发生什么变化？`;
  return `请用自己的话说一遍，第 ${lineNumber} 行在做什么？`;
}

export default function LearningWorkspace({
  sessionId,
  fallbackAnalysis,
  onClose,
  mode = 'modal',
  onMistakeAdded
}) {
  const [session, setSession] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [understanding, setUnderstanding] = useState('');
  const [mistakeQuestion, setMistakeQuestion] = useState('');
  const [mistakeNote, setMistakeNote] = useState('');
  const [addingMistake, setAddingMistake] = useState(false);
  const [notice, setNotice] = useState('');
  const [noviceMode, setNoviceMode] = useState(() => localStorage.getItem('daimaxuexi_learning_mode') !== 'advanced');
  const [practiceType, setPracticeType] = useState('restate');
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [practiceFeedback, setPracticeFeedback] = useState(null);

  useEffect(() => {
    localStorage.setItem('daimaxuexi_learning_mode', noviceMode ? 'novice' : 'advanced');
  }, [noviceMode]);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    api(`/api/learning/sessions/${sessionId}`)
      .then((response) => setSession(response.session))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const analysis = session?.analysis && Object.keys(session.analysis).length > 0 ? session.analysis : (fallbackAnalysis || {});
  const sourceCode = session?.code || fallbackAnalysis?.source_code || '';
  const lines = useMemo(() => String(sourceCode).split(/\r?\n/), [sourceCode]);
  const currentInsight = session?.insights?.find((item) => item.lineNumber === selectedLine);
  const currentQuestions = (session?.questions || []).filter((item) => item.lineNumber === selectedLine);
  const currentUnderstandings = (session?.understandings || []).filter((item) => item.lineNumber === selectedLine);

  async function selectLine(lineNumber) {
    setSelectedLine(lineNumber);
    setError('');
    if (!sessionId || session?.insights?.some((item) => item.lineNumber === lineNumber)) return;
    setLoading(true);
    try {
      const response = await api(`/api/learning/sessions/${sessionId}/lines/${lineNumber}/explain`, {
        method: 'POST'
      });
      setSession((current) => ({
        ...current,
        insights: [
          ...(current?.insights || []).filter((item) => item.lineNumber !== lineNumber),
          response.insight
        ]
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function askQuestion() {
    if (!question.trim() || !selectedLine || !sessionId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api(`/api/learning/sessions/${sessionId}/lines/${selectedLine}/questions`, {
        method: 'POST',
        body: JSON.stringify({ question })
      });
      setSession((current) => ({
        ...current,
        questions: [...(current?.questions || []), response.question]
      }));
      setQuestion('');
      setNotice('提问已保存');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveUnderstanding() {
    if (!understanding.trim() || !selectedLine || !sessionId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api(`/api/learning/sessions/${sessionId}/lines/${selectedLine}/understandings`, {
        method: 'POST',
        body: JSON.stringify({ content: understanding })
      });
      setSession((current) => ({
        ...current,
        understandings: [...(current?.understandings || []), response.understanding]
      }));
      setUnderstanding('');
      setNotice('你的理解已保存，可以在下面回顾');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitPractice() {
    if (!sessionId || !selectedLine || !practiceAnswer.trim()) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await api(`/api/learning/sessions/${sessionId}/lines/${selectedLine}/practice`, {
        method: 'POST',
        body: JSON.stringify({
          practiceType,
          question: practiceQuestionText(practiceType, selectedLine),
          userAnswer: practiceAnswer
        })
      });
      setPracticeFeedback(response.feedback || null);
      setSession((current) => ({
        ...current,
        practice: [response.practice, ...(current?.practice || [])]
      }));
      setNotice(response.feedback?.encouragement || '已记录这次练习');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function markLearned(status) {
    if (!sessionId || !selectedLine) return;
    setError('');
    try {
      await api('/api/mistakes', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          itemType: 'line',
          startLine: selectedLine,
          endLine: selectedLine,
          title: `第 ${selectedLine} 行`,
          codeSnippet: lines[selectedLine - 1] || '',
          question: practiceQuestionText(practiceType, selectedLine),
          note: practiceAnswer,
          status: status === 'learned' ? 'resolved' : 'unresolved'
        })
      });
      setNotice(status === 'learned' ? '已记录：我学会了' : '已加入错题库，稍后继续复习');
      onMistakeAdded?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addLineMistake() {
    if (!sessionId || !selectedLine || !mistakeQuestion.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api('/api/mistakes', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          itemType: 'line',
          startLine: selectedLine,
          endLine: selectedLine,
          title: `第 ${selectedLine} 行`,
          codeSnippet: lines[selectedLine - 1] || '',
          question: mistakeQuestion,
          note: mistakeNote
        })
      });
      setMistakeQuestion('');
      setMistakeNote('');
      setAddingMistake(false);
      setNotice('已加入错题库');
      onMistakeAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addFunctionMistake() {
    if (!sessionId || !selectedLine) return;
    setLoading(true);
    setError('');
    try {
      const start = selectedLine;
      const end = Math.min(lines.length, Math.max(start + 20, start));
      await api('/api/mistakes', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          itemType: 'function',
          startLine: start,
          endLine: end,
          title: `第 ${start}-${end} 行函数`,
          codeSnippet: lines.slice(start - 1, end).join('\n'),
          question: mistakeQuestion || '这个函数整体没有理解',
          note: mistakeNote
        })
      });
      setMistakeQuestion('');
      setMistakeNote('');
      setAddingMistake(false);
      setNotice('已把这个函数加入错题库');
      onMistakeAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const workspace = (
    <div className={`learning-layout ${mode === 'page' ? 'learning-page-layout' : ''}`}>
      <div className="learning-code">
        <div className="section-title"><Code2 size={16} />点击一行，单独问明白</div>
        <div className="code-lines">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            return (
              <button
                type="button"
                key={lineNumber}
                className={`code-line ${selectedLine === lineNumber ? 'active' : ''}`}
                onClick={() => selectLine(lineNumber)}
              >
                <span className="line-number">{lineNumber}</span>
                <code>{line || ' '}</code>
              </button>
            );
          })}
        </div>
      </div>

      <div className="learning-detail">
        <div className="snippet-section">
          <div className="section-title"><CheckCircle2 size={16} />整体通俗讲解</div>
          <p className="explanation"><HighlightedText text={analysis.explanation || '暂无讲解'} /></p>
        </div>

        {!selectedLine && (
          <div className="learning-empty">
            <HelpCircle size={22} />
            <span>点击左侧任意一行，查看这一行的单独讲解</span>
          </div>
        )}

        {selectedLine && (
          <>
            <div className="selected-line-card">
              <span>第 {selectedLine} 行</span>
              <code><HighlightedText text={lines[selectedLine - 1]} forceHighlight /></code>
            </div>
            {loading && <div className="learning-loading"><Loader2 size={18} className="spin" />正在拆解这一行</div>}
            <div className="learning-mode-switch">
              <span>讲解方式</span>
              <button
                type="button"
                className={`chip ${noviceMode ? 'active' : ''}`}
                onClick={() => setNoviceMode(true)}
              >
                新手模式
              </button>
              <button
                type="button"
                className={`chip ${!noviceMode ? 'active' : ''}`}
                onClick={() => setNoviceMode(false)}
              >
                进阶模式
              </button>
            </div>

            <InsightBody insight={currentInsight?.insight} noviceMode={noviceMode} />

            <div className="learning-box">
              <div className="section-title"><MessageSquareText size={16} />这一行还是没懂？直接问</div>
              <textarea
                rows={3}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="例如：为什么这里要用 await？"
              />
              <button className="btn btn-primary" onClick={askQuestion} disabled={loading || !question.trim()}>
                <Send size={16} />提交问题
              </button>
              {currentQuestions.map((item) => (
                <div className="qa-record" key={item.id}>
                  <p className="qa-question">你问：{item.question}</p>
                  <p><HighlightedText text={item.answer?.direct_answer} /></p>
                  {item.answer?.analogy && <p><HighlightedText text={item.answer.analogy} /></p>}
                  {Array.isArray(item.answer?.step_by_step) && item.answer.step_by_step.map((step, index) => (
                    <p key={index}><HighlightedText text={step} /></p>
                  ))}
                  {item.answer?.correction && <p><HighlightedText text={item.answer.correction} /></p>}
                  {item.answer?.self_check && <p className="self-check">{item.answer.self_check}</p>}
                </div>
              ))}
            </div>

            <div className="learning-box">
              <div className="section-title"><Lightbulb size={16} />我自己是怎么理解的</div>
              <p className="muted">可以用自己的话说，不要求专业。AI 会指出哪里理解对了、哪里还要补充。</p>
              <textarea
                rows={4}
                value={understanding}
                onChange={(event) => setUnderstanding(event.target.value)}
                placeholder="用你的话写一遍这行代码在做什么"
              />
              <button className="btn btn-primary" onClick={saveUnderstanding} disabled={loading || !understanding.trim()}>
                <Save size={16} />保存并让 AI 点评
              </button>
              {currentUnderstandings.map((item, index) => (
                <div className="understanding-record" key={item.id}>
                  <span className="record-version">第 {index + 1} 次理解</span>
                  <p>{item.content}</p>
                  {Array.isArray(item.feedback.correct_parts) && item.feedback.correct_parts.length > 0 && (
                    <div className="feedback-correct">
                      <strong>理解对的地方</strong>
                      {item.feedback.correct_parts.map((text, i) => <p key={i}><HighlightedText text={text} /></p>)}
                    </div>
                  )}
                  {Array.isArray(item.feedback.missing_parts) && item.feedback.missing_parts.length > 0 && (
                    <div className="feedback-missing">
                      <strong>还缺了什么</strong>
                      {item.feedback.missing_parts.map((text, i) => <p key={i}><HighlightedText text={text} /></p>)}
                    </div>
                  )}
                  {Array.isArray(item.feedback.wrong_parts) && item.feedback.wrong_parts.map((part, i) => (
                    <div className="feedback-wrong" key={i}>
                      <strong>这里的理解需要修正</strong>
                      <p>{part.what_user_said}</p>
                      <p><HighlightedText text={part.why_wrong} /></p>
                      <p><HighlightedText text={part.correct_understanding} /></p>
                    </div>
                  ))}
                  {item.feedback.guiding_question && <p className="guiding-question">{item.feedback.guiding_question}</p>}
                  {item.feedback.standard_explanation && (
                    <div className="standard-explanation">
                      <strong>标准理解</strong>
                      <p><HighlightedText text={item.feedback.standard_explanation} /></p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="learning-box">
              <div className="section-title"><HelpCircle size={16} />练一练</div>
              <div className="practice-task">
                <span>把这行代码讲给别人听</span>
                <textarea
                  rows={3}
                  value={practiceAnswer}
                  onChange={(event) => setPracticeAnswer(event.target.value)}
                  placeholder={practiceQuestionText(practiceType, selectedLine)}
                />
                <button className="btn btn-primary" onClick={submitPractice} disabled={loading || !practiceAnswer.trim()}>
                  <CheckCircle2 size={16} />提交练习
                </button>
                {practiceFeedback && (
                  <div className="practice-feedback">
                    <p><HighlightedText text={practiceFeedback.encouragement} /></p>
                    {practiceFeedback.next_hint && <p><HighlightedText text={practiceFeedback.next_hint} /></p>}
                  </div>
                )}
              </div>
            </div>

            <div className="learning-box">
              <div className="section-title"><HelpCircle size={16} />收进错题库</div>
              {!addingMistake && (
                <div className="action-row">
                  <button className="btn" onClick={() => setAddingMistake(true)}>加入错题</button>
                  <button className="btn btn-ghost" onClick={addFunctionMistake} disabled={loading}>把这段函数加入错题库</button>
                </div>
              )}
              {addingMistake && (
                <div className="stack">
                  <textarea
                    rows={3}
                    value={mistakeQuestion}
                    onChange={(event) => setMistakeQuestion(event.target.value)}
                    placeholder="写下具体没懂的问题"
                  />
                  <textarea
                    rows={2}
                    value={mistakeNote}
                    onChange={(event) => setMistakeNote(event.target.value)}
                    placeholder="复习笔记，可以不填"
                  />
                  <div className="action-row">
                    <button className="btn btn-primary" onClick={addLineMistake} disabled={loading || !mistakeQuestion.trim()}>保存行错题</button>
                    <button className="btn" onClick={() => setAddingMistake(false)}>取消</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {notice && <div className="alert-success">{notice}</div>}
        {error && <div className="alert-error">{error}</div>}
        <div className="snippet-meta">
          <div><span>置信度</span><strong>{analysis.confidence || '中'}</strong></div>
          <div><span>文件</span><strong>{analysis.file || session?.fileName || '未知'}</strong></div>
          <div><span>风险</span><strong>{analysis.risk_level || '低'}</strong></div>
          <div><span>风险原因</span><strong>{analysis.risk_reason || '无'}</strong></div>
        </div>
        <CodePreview code={analysis.alternative_code} />
      </div>
    </div>
  );

  if (mode === 'page') return workspace;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal snippet-modal learning-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="pill">{analysis.style_toggle || 'simple'}</span>
            <span className={`risk-pill ${analysis.risk_level === '高' ? 'high' : analysis.risk_level === '中' ? 'mid' : 'low'}`}>
              <ShieldAlert size={14} />风险 {analysis.risk_level || '低'}
            </span>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        {workspace}
      </div>
    </div>
  );
}
