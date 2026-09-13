const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/components/LearningWorkspace.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

// 新增练习状态
t = t.replace(
`  const [noviceMode, setNoviceMode] = useState(() => localStorage.getItem('daimaxuexi_learning_mode') !== 'advanced');`,
`  const [noviceMode, setNoviceMode] = useState(() => localStorage.getItem('daimaxuexi_learning_mode') !== 'advanced');
  const [practiceType, setPracticeType] = useState('restate');
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [practiceFeedback, setPracticeFeedback] = useState(null);`
);

// 新增提交练习方法
t = t.replace(
`  async function addLineMistake() {`,
`  async function submitPractice() {
    if (!sessionId || !selectedLine || !practiceAnswer.trim()) return;
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await api(\`/api/learning/sessions/\${sessionId}/lines/\${selectedLine}/practice\`, {
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
          title: \`第 \${selectedLine} 行\`,
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

  async function addLineMistake() {`
);

// 工具函数
t = t.replace(
`export default function LearningWorkspace({`,
`function practiceQuestionText(type, lineNumber) {
  if (type === 'predict') return \`预测第 \${lineNumber} 行执行后会发生什么？\`;
  if (type === 'change') return \`如果把第 \${lineNumber} 行里的一个变量改掉，会发生什么变化？\`;
  return \`请用自己的话说一遍，第 \${lineNumber} 行在做什么？\`;
}

export default function LearningWorkspace({`
);

// 界面：小练习区块
t = t.replace(
`            <div className="learning-box">
              <div className="section-title"><MessageSquareText size={16} />还是不懂，继续问</div>`,
`            <div className="learning-box practice-box">
              <div className="section-title"><Lightbulb size={16} />小练习，检查自己真的懂了</div>
              <div className="practice-types">
                <button type="button" className={\`chip \${practiceType === 'predict' ? 'active' : ''}\`} onClick={() => setPracticeType('predict')}>预测结果</button>
                <button type="button" className={\`chip \${practiceType === 'change' ? 'active' : ''}\`} onClick={() => setPracticeType('change')}>改一个变量</button>
                <button type="button" className={\`chip \${practiceType === 'restate' ? 'active' : ''}\`} onClick={() => setPracticeType('restate')}>复述这一行</button>
              </div>
              <p className="practice-question">{practiceQuestionText(practiceType, selectedLine)}</p>
              <textarea
                rows={3}
                value={practiceAnswer}
                onChange={(event) => setPracticeAnswer(event.target.value)}
                placeholder="用你自己的话写下来，写错也没关系"
              />
              <div className="action-row">
                <button className="btn btn-primary" onClick={submitPractice} disabled={loading || !practiceAnswer.trim()}>
                  {loading ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                  检查我的答案
                </button>
                <button className="btn" onClick={() => markLearned('learned')} disabled={loading}>我学会了</button>
                <button className="btn btn-ghost" onClick={() => markLearned('not-yet')} disabled={loading}>我还不会</button>
              </div>
              {practiceFeedback && (
                <div className="practice-feedback">
                  {Array.isArray(practiceFeedback.correct_parts) && practiceFeedback.correct_parts.length > 0 && (
                    <div className="feedback-correct">
                      <strong>理解对的地方</strong>
                      {practiceFeedback.correct_parts.map((item, index) => <p key={index}><HighlightedText text={item} /></p>)}
                    </div>
                  )}
                  {Array.isArray(practiceFeedback.missing_parts) && practiceFeedback.missing_parts.length > 0 && (
                    <div className="feedback-missing">
                      <strong>还可以补充</strong>
                      {practiceFeedback.missing_parts.map((item, index) => <p key={index}><HighlightedText text={item} /></p>)}
                    </div>
                  )}
                  {Array.isArray(practiceFeedback.wrong_parts) && practiceFeedback.wrong_parts.map((part, index) => (
                    <div className="feedback-wrong" key={index}>
                      <strong>这里需要修正</strong>
                      <p>{part.what_user_said}</p>
                      <p><HighlightedText text={part.why_wrong} /></p>
                      <p><HighlightedText text={part.correct_understanding} /></p>
                    </div>
                  ))}
                  {practiceFeedback.standard_explanation && (
                    <div className="standard-explanation">
                      <strong>标准答案</strong>
                      <p><HighlightedText text={practiceFeedback.standard_explanation} /></p>
                    </div>
                  )}
                  {practiceFeedback.suggest_mistake && <p className="guiding-question">建议把这题加入错题库，过几天再复习一次。</p>}
                </div>
              )}
            </div>

            <div className="learning-box">
              <div className="section-title"><MessageSquareText size={16} />还是不懂，继续问</div>`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("PRACTICE_UI_ADDED practice=" + (t.match(/practice/g) || []).length);