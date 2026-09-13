import { useState } from 'react';
import { BookOpenText, Gift, KeyRound, Loader2, Rocket, Trash2 } from 'lucide-react';
import { api, clearToken } from '../api';

const LEARNING_MODE_KEY = 'daimaxuexi_learning_mode';

export default function SettingsPanel({ user, setUser, onLogout }) {
  const [provider, setProvider] = useState(user.provider || 'deepseek');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState(user.model || '');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [learningMode, setLearningMode] = useState(
    () => localStorage.getItem(LEARNING_MODE_KEY) || 'novice'
  );
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  async function saveApiKey() {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const data = await api('/api/settings/apikey', {
        method: 'POST',
        body: JSON.stringify({ provider, apiKey, baseUrl, model })
      });
      setUser(data.user);
      setApiKey('');
      setMessage('API Key 已保存');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function saveLearningMode(nextMode) {
    setLearningMode(nextMode);
    localStorage.setItem(LEARNING_MODE_KEY, nextMode);
    setMessage(nextMode === 'novice' ? '已切换到新手模式' : '已切换到进阶模式');
  }

  async function redeem() {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const data = await api('/api/membership/redeem', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      setUser(data.user);
      setCode('');
      setMessage('会员已激活');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAll() {
    if (!window.confirm('确定删除全部账号数据和记录吗？此操作不能撤销。')) return;
    setError('');
    setLoading(true);
    try {
      await api('/api/me/data', { method: 'DELETE' });
      clearToken();
      onLogout();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function deleteAccount() {
    if (!deletePassword) {
      setError('请输入当前密码确认注销');
      return;
    }
    if (!window.confirm('确定永久注销账号吗？注销后用户名可以重新注册，此操作不能撤销。')) return;
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api('/api/me/account', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword })
      });
      clearToken();
      onLogout();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="settings-layout">
      <section className="panel">
        <div className="section-title"><KeyRound size={16} />模型服务</div>
        <div className="settings-grid">
          <label className="field">
            <span>服务商</span>
            <select value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="deepseek">DeepSeek</option>
              <option value="openai">OpenAI 兼容</option>
              <option value="custom">自定义接口</option>
            </select>
          </label>
          <label className="field">
            <span>API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={user.apiKey ? `已保存 ${user.apiKey}` : '填写 API Key'}
            />
          </label>
          {provider === 'custom' && (
            <label className="field">
              <span>接口地址</span>
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://example.com/v1" />
            </label>
          )}
          <label className="field">
            <span>模型名称</span>
            <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="例如 deepseek-chat" />
          </label>
        </div>
        <div className="action-row">
          <button className="btn btn-primary" onClick={saveApiKey} disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <KeyRound size={16} />}
            保存
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title"><BookOpenText size={16} />讲解模式</div>
        <p className="muted">新手模式会多用比喻、逐个解释变量；进阶模式更强调结构和边界情况。</p>
        <div className="mode-choice">
          <button
            type="button"
            className={`mode-card ${learningMode === 'novice' ? 'active' : ''}`}
            onClick={() => saveLearningMode('novice')}
          >
            <BookOpenText size={18} />
            <strong>新手模式</strong>
            <span>先一句话总结，再用生活比喻逐行讲</span>
          </button>
          <button
            type="button"
            className={`mode-card ${learningMode === 'advanced' ? 'active' : ''}`}
            onClick={() => saveLearningMode('advanced')}
          >
            <Rocket size={18} />
            <strong>进阶模式</strong>
            <span>直接讲原理，关注性能、结构、边界情况</span>
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-title"><Gift size={16} />会员激活</div>
        <p className="muted">输入会员码即可激活会员权限。</p>
        <div className="action-row">
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="会员码" />
          <button className="btn" onClick={redeem} disabled={loading}>
            激活
          </button>
        </div>
      </section>

      <section className="panel danger-panel">
        <div className="section-title"><Trash2 size={16} />数据管理</div>
        <p className="muted">当前账号的分析记录会一直保存，直到你主动删除。</p>
        <button className="btn btn-danger" onClick={deleteAll} disabled={loading}>
          <Trash2 size={16} />
          删除全部数据
        </button>
        <div className="account-delete">
          <strong>注销账号</strong>
          <p>永久删除账号、API Key、学习历史和错题库。注销后用户名可以重新注册。</p>
          {!showDeleteAccount && (
            <button className="btn btn-danger" onClick={() => setShowDeleteAccount(true)} disabled={loading}>
              注销账号
            </button>
          )}
          {showDeleteAccount && (
            <div className="stack">
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                placeholder="输入当前密码确认注销"
              />
              <div className="action-row">
                <button className="btn btn-danger" onClick={deleteAccount} disabled={loading || !deletePassword}>
                  确认永久注销
                </button>
                <button className="btn" onClick={() => setShowDeleteAccount(false)} disabled={loading}>
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {message && <div className="alert-success">{message}</div>}
      {error && <div className="alert-error">{error}</div>}
    </div>
  );
}
