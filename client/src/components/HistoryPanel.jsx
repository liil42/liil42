import { useEffect, useState } from 'react';
import { Edit3, History, Plus, Tag, Trash2, X } from 'lucide-react';
import { api } from '../api';
import LearningWorkspace from './LearningWorkspace';
import LoadingView from './LoadingView';

const TYPE_LABELS = {
  snippet: '代码片段',
  file: '代码文件',
  project: '项目分析',
  zip: '项目压缩包',
  folder: '本地项目',
  github: 'GitHub 项目',
  url: '网页分析',
  error: '报错日志',
  annotate: '注释版'
};

export default function HistoryPanel({ refreshKey = 0 }) {
  const [sessions, setSessions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [sessionData, categoryData] = await Promise.all([
        api('/api/learning/sessions'),
        api('/api/learning/categories')
      ]);
      setSessions(sessionData.sessions || []);
      setCategories(categoryData.categories || []);
    } catch (err) {
      setError(err.message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [refreshKey]);

  async function createCategory() {
    if (!newCategory.trim()) return;
    setError('');
    try {
      await api('/api/learning/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategory.trim(), color: '#38bdf8' })
      });
      setNewCategory('');
      setNotice('分类已创建');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startRenameCategory(category) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  }

  async function renameCategory(id) {
    const name = editingCategoryName.trim();
    if (!name) return;
    setError('');
    try {
      const current = categories.find((category) => category.id === id);
      await api(`/api/learning/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, color: current?.color || '#38bdf8' })
      });
      setEditingCategoryId('');
      setEditingCategoryName('');
      setNotice('分类已改名');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteCategory(id) {
    if (!window.confirm('删除这个分类吗？历史记录会保留，但会取消分类。')) return;
    setError('');
    try {
      await api(`/api/learning/categories/${id}`, { method: 'DELETE' });
      if (activeCategory === id) setActiveCategory('');
      setNotice('分类已删除，历史记录仍然保留');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function assignCategory(sessionId, categoryId) {
    setError('');
    try {
      await api(`/api/learning/sessions/${sessionId}/category`, {
        method: 'PUT',
        body: JSON.stringify({ categoryId: categoryId || null })
      });
      setNotice(categoryId ? '已更新分类' : '已取消分类');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const filtered = activeCategory
    ? sessions.filter((item) => item.categoryId === activeCategory)
    : sessions;

  return (
    <div className="history-shell">
      <div className="history-toolbar">
        <div className="category-filter">
          <button className={`chip ${activeCategory === '' ? 'active' : ''}`} onClick={() => setActiveCategory('')}>
            全部 {sessions.length}
          </button>
          {categories.map((category) => (
            <span className="category-item" key={category.id}>
              <button
                className={`chip ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span className="category-dot" style={{ background: category.color }} />
                {category.name}
              </button>
              <span className="category-inline-actions">
                {editingCategoryId === category.id ? (
                  <>
                    <input
                      className="category-rename-input"
                      value={editingCategoryName}
                      onChange={(event) => setEditingCategoryName(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && renameCategory(category.id)}
                      autoFocus
                    />
                    <button className="icon-btn" title="保存分类名称" onClick={() => renameCategory(category.id)}>
                      <Edit3 size={14} />
                    </button>
                    <button className="icon-btn" title="取消改名" onClick={() => setEditingCategoryId('')}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="icon-btn" title="重命名分类" onClick={() => startRenameCategory(category)}>
                      <Edit3 size={14} />
                    </button>
                    <button className="icon-btn" title="删除分类" onClick={() => deleteCategory(category.id)}>
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </span>
            </span>
          ))}
        </div>
        <div className="category-create">
          <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="新建分类" />
          <button className="btn" onClick={createCategory} disabled={!newCategory.trim()}>
            <Plus size={16} />添加
          </button>
        </div>
      </div>

      {notice && <div className="alert-success">{notice}</div>}
      {error && <div className="alert-error">{error}</div>}
      <div className="history-layout">
        <div className="history-list">
          {loading && <LoadingView text="正在加载学习历史" />}
          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <History size={22} />
              <span>还没有学习记录</span>
            </div>
          )}
          {filtered.map((item) => (
            <div className={`history-item ${activeSession?.id === item.id ? 'active' : ''}`} key={item.id}>
              <button className="history-open" onClick={() => setActiveSession(item)}>
                <span className="type-badge">{TYPE_LABELS[item.sourceType] || item.categoryName || '未分类'}</span>
                <strong>{item.fileName}</strong>
                <small>{new Date(item.createdAt).toLocaleString('zh-CN')}</small>
              </button>
              <div className="history-actions">
                <select
                  value={item.categoryId || ''}
                  onChange={(event) => assignCategory(item.id, event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                >
                  <option value="">未分类</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                {item.categoryId && (
                  <button className="icon-btn" title="删除分类" onClick={() => deleteCategory(item.categoryId)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="history-detail">
          {!activeSession && (
            <div className="empty-state">
              <Tag size={22} />
              <span>选择一条学习记录，继续逐行学习</span>
            </div>
          )}
          {activeSession && (
            <div className="report-panel learning-history-detail">
              <div className="report-header">
                <div>
                  <h2>{activeSession.fileName}</h2>
                  <span>{TYPE_LABELS[activeSession.sourceType] || activeSession.categoryName || '未分类'}</span>
                </div>
                <button className="icon-btn" title="关闭" onClick={() => setActiveSession(null)}>
                  <X size={18} />
                </button>
              </div>
              <LearningWorkspace sessionId={activeSession.id} mode="page" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
