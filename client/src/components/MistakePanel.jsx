import { useEffect, useState } from 'react';
import { CheckCircle2, Filter, RotateCcw, Trash2 } from 'lucide-react';
import { api } from '../api';
import LearningWorkspace from './LearningWorkspace';
import LoadingView from './LoadingView';

const STATUS_LABELS = {
  unresolved: '未掌握',
  reviewing: '复习中',
  resolved: '已掌握'
};

export default function MistakePanel({ refreshKey = 0 }) {
  const [mistakes, setMistakes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [itemType, setItemType] = useState('');
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dueCount, setDueCount] = useState(0);
  const [reviewing, setReviewing] = useState(null);
  const [reviewAnswer, setReviewAnswer] = useState('');
  const [reviewResult, setReviewResult] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (categoryId) params.set('categoryId', categoryId);
      if (itemType) params.set('itemType', itemType);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const [mistakeData, categoryData, dueData] = await Promise.all([
        api(`/api/mistakes${suffix}`),
        api('/api/learning/categories'),
        api('/api/mistakes/due/count')
      ]);
      setMistakes(mistakeData.mistakes || []);
      setCategories(categoryData.categories || []);
      setDueCount(dueData.count || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status, categoryId, itemType, refreshKey]);

  function startReview(item) {
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
      const data = await api(`/api/mistakes/${reviewing.id}/review-result`, {
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
  }

  async function resolve(item) {
    setError('');
    try {
      await api(`/api/mistakes/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'resolved' })
      });
      setNotice('已标记为掌握');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(item) {
    if (!window.confirm('删除这道错题吗？')) return;
    setError('');
    try {
      await api(`/api/mistakes/${item.id}`, { method: 'DELETE' });
      if (active?.id === item.id) setActive(null);
      setNotice('错题已删除');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mistake-shell">
      <div className="mistake-toolbar">
        <div className="section-title">
          <Filter size={16} />筛选错题
          <span className="due-badge">今日待复习 {dueCount}</span>
        </div>
        <div className="mistake-view-tabs">
          <button className={`chip ${status === 'due' ? 'active' : ''}`} onClick={() => setStatus('due')}>今日要复习</button>
          <button className={`chip ${status === 'unresolved' ? 'active' : ''}`} onClick={() => setStatus('unresolved')}>还没掌握</button>
          <button className={`chip ${status === 'resolved' ? 'active' : ''}`} onClick={() => setStatus('resolved')}>已掌握</button>
          <button className={`chip ${status === '' ? 'active' : ''}`} onClick={() => setStatus('')}>全部错题</button>
        </div>
        <div className="mistake-filters">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">全部状态</option>
            <option value="unresolved">未掌握</option>
            <option value="reviewing">复习中</option>
            <option value="resolved">已掌握</option>
            <option value="due">今日待复习</option>
          </select>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">全部分类</option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>{category.name}</option>
            ))}
          </select>
          <select value={itemType} onChange={(event) => setItemType(event.target.value)}>
            <option value="">行和函数</option>
            <option value="line">代码行</option>
            <option value="function">函数</option>
          </select>
        </div>
      </div>

      {notice && <div className="alert-success">{notice}</div>}
      {error && <div className="alert-error">{error}</div>}
      <div className="mistake-layout">
        <div className="mistake-list">
          {loading && <LoadingView text="正在加载错题" />}
          {!loading && mistakes.length === 0 && <div className="empty-state">暂无错题</div>}
          {mistakes.map((item) => (
            <div className={`mistake-item ${active?.id === item.id ? 'active' : ''}`} key={item.id}>
              <button className="mistake-main" onClick={() => setActive(item)}>
                <span className={`mistake-status ${item.status}`}>{STATUS_LABELS[item.status]}</span>
                <strong>{item.title}</strong>
                <p>{item.question}</p>
                <small>
                  {item.categoryName || '未分类'} · 复习 {item.reviewCount} 次 · 连对 {item.correctStreak}
                  {item.nextReviewAt ? ' · 下次 ' + new Date(item.nextReviewAt).toLocaleDateString('zh-CN') : ''}
                </small>
              </button>
              <div className="mistake-actions">
                <button className="icon-btn" title="开始复习" onClick={() => startReview(item)}>
                  <RotateCcw size={15} />
                </button>
                <button className="icon-btn" title="标记已掌握" onClick={() => resolve(item)}>
                  <CheckCircle2 size={15} />
                </button>
                <button className="icon-btn" title="删除错题" onClick={() => remove(item)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mistake-detail">
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
          {!reviewing && !active && <div className="empty-state">选择一道错题继续学习</div>}
          {!reviewing && active && (
            <div className="report-panel learning-history-detail">
              <div className="report-header">
                <div>
                  <h2>{active.title}</h2>
                  <span>{active.codeSnippet}</span>
                </div>
              </div>
              <LearningWorkspace sessionId={active.sessionId} mode="page" onMistakeAdded={load} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
