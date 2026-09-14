const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/components/MistakePanel.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

// 状态增加 due
t = t.replace(
`  const [notice, setNotice] = useState('');`,
`  const [notice, setNotice] = useState('');
  const [dueCount, setDueCount] = useState(0);
  const [reviewing, setReviewing] = useState(null);
  const [reviewAnswer, setReviewAnswer] = useState('');
  const [reviewResult, setReviewResult] = useState(null);`
);

t = t.replace(
`      const [mistakeData, categoryData] = await Promise.all([
        api(\`/api/mistakes\${suffix}\`),
        api('/api/learning/categories')
      ]);
      setMistakes(mistakeData.mistakes || []);
      setCategories(categoryData.categories || []);`,
`      const [mistakeData, categoryData, dueData] = await Promise.all([
        api(\`/api/mistakes\${suffix}\`),
        api('/api/learning/categories'),
        api('/api/mistakes/due/count')
      ]);
      setMistakes(mistakeData.mistakes || []);
      setCategories(categoryData.categories || []);
      setDueCount(dueData.count || 0);`
);

// 用复习结果替代旧的 review
t = t.replace(
`  async function review(item) {
    setError('');
    try {
      await api(\`/api/mistakes/\${item.id}/review\`, { method: 'POST' });
      setNotice('已记录一次复习');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }`,
`  function startReview(item) {
    setReviewing(item);
    setReviewAnswer('');
    setReviewResult(null);
    setNotice('');
    setError('');
  }

  async function submitReview(correct) {
    if (!reviewing) return;
    setError('');
    try {
      const data = await api(\`/api/mistakes/\${reviewing.id}/review-result\`, {
        method: 'POST',
        body: JSON.stringify({ correct })
      });
      setReviewResult(data.mistake);
      setNotice(correct ? '答对了，下次复习时间已延后' : '没关系，这道题明天再复习一次');
      setDueCount(data.dueCount || 0);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }`
);

// 筛选增加今日待复习
t = t.replace(
`          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">全部状态</option>
            <option value="unresolved">未掌握</option>
            <option value="reviewing">复习中</option>
            <option value="resolved">已掌握</option>
          </select>`,
`          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">全部状态</option>
            <option value="unresolved">未掌握</option>
            <option value="reviewing">复习中</option>
            <option value="resolved">已掌握</option>
            <option value="due">今日待复习</option>
          </select>`
);

// 工具栏显示待复习数量（新增加一行）
t = t.replace(
`        <div className="section-title"><Filter size={16} />筛选错题</div>`,
`        <div className="section-title">
          <Filter size={16} />筛选错题
          <span className="due-badge">今日待复习 {dueCount}</span>
        </div>`
);

// 列表展示复习调度信息
t = t.replace(
`                <small>{item.categoryName || '未分类'} · 复习 {item.reviewCount} 次</small>`,
`                <small>
                  {item.categoryName || '未分类'} · 复习 {item.reviewCount} 次 · 连对 {item.correctStreak}
                  {item.nextReviewAt ? ' · 下次 ' + new Date(item.nextReviewAt).toLocaleDateString('zh-CN') : ''}
                </small>`
);

// 按钮改为开始复习
t = t.replace(
`                <button className="icon-btn" title="继续复习" onClick={() => review(item)}>
                  <RotateCcw size={15} />
                </button>`,
`                <button className="icon-btn" title="开始复习" onClick={() => startReview(item)}>
                  <RotateCcw size={15} />
                </button>`
);

// 复习面板
t = t.replace(
`        <div className="mistake-detail">
          {!active && <div className="empty-state">选择一道错题继续学习</div>}`,
`        <div className="mistake-detail">
          {reviewing && (
            <div className="report-panel review-panel">
              <div className="report-header">
                <div>
                  <h2>复习：{reviewing.title}</h2>
                  <span>{reviewing.codeSnippet}</span>
                </div>
              </div>
              {!reviewResult && (
                <div className="stack">
                  <p className="practice-question">{reviewing.question}</p>
                  <textarea
                    rows={4}
                    value={reviewAnswer}
                    onChange={(event) => setReviewAnswer(event.target.value)}
                    placeholder="先自己想一遍，再决定答对还是答错"
                  />
                  <div className="action-row">
                    <button className="btn btn-primary" onClick={() => submitReview(true)} disabled={!reviewAnswer.trim()}>我答对了</button>
                    <button className="btn" onClick={() => submitReview(false)}>还是没懂</button>
                    <button className="btn btn-ghost" onClick={() => setReviewing(null)}>退出复习</button>
                  </div>
                </div>
              )}
              {reviewResult && (
                <div className="stack">
                  <div className="alert-success">
                    连对 {reviewResult.correctStreak} 次
                    {reviewResult.status === 'resolved'
                      ? '，已经标记为掌握'
                      : reviewResult.nextReviewAt
                        ? '，下次复习：' + new Date(reviewResult.nextReviewAt).toLocaleDateString('zh-CN')
                        : ''}
                  </div>
                  <button className="btn btn-primary" onClick={() => setReviewing(null)}>完成这次复习</button>
                </div>
              )}
            </div>
          )}
          {!reviewing && !active && <div className="empty-state">选择一道错题继续学习</div>}`
);

// 详情区在有复习时隐藏
t = t.replace(
`          {active && (
            <div className="report-panel learning-history-detail">`,
`          {!reviewing && active && (
            <div className="report-panel learning-history-detail">`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("MISTAKE_REVIEW_UI_ADDED");