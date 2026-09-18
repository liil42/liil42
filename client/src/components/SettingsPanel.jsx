import { useState } from 'react';
import { BookOpenText, ExternalLink, KeyRound, Loader2, PlugZap, Rocket, RotateCcw, Trash2 } from 'lucide-react';
import { api, clearToken } from '../api';

const LEARNING_MODE_KEY = 'daimaxuexi_learning_mode';
const DEFAULT_MODELS = {
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o-mini',
  custom: ''
};

export default function SettingsPanel({ user, setUser, onLogout, onOpenTutorial }) {
  const [provider, setProvider] = useState(user.provider || 'deepseek');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState(user.model || DEFAULT_MODELS[user.provider || 'deepseek'] || '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [learningMode, setLearningMode] = useState(
    () => localStorage.getItem(LEARNING_MODE_KEY) || 'novice'
  );
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  function changeProvider(nextProvider) {
    setProvider(nextProvider);
    setModel(DEFAULT_MODELS[nextProvider] || '');
    setMessage('');
    setError('');
  }

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

  async function testConnection() {
    setError('');
    setMessage('');
    setTesting(true);
    try {
      const data = await api('/api/settings/test-connection', {
        method: 'POST',
        body: JSON.stringify({ provider, apiKey, baseUrl, model })
      });
      setMessage(data.message || '连接成功');
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  }

  function saveLearningMode(nextMode) {
    setLearningMode(nextMode);
    localStorage.setItem(LEARNING_MODE_KEY, nextMode);
    setMessage(nextMode === 'novice' ? '已切换到新手模式' : '已切换到进阶模式');
  }

  async function deleteAll() {
    if (!window.confirm('确定删除当前账号的全部学习数据吗？此操作不能撤销。')) return;
    setError('');
    setMessage('');
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

  const isDeepSeek = provider === 'deepseek';
  const isCustom = provider === 'custom';

  return (
    <div className="settings-layout">
      <section className="panel">
        <div className="section-title"><KeyRound size={16} />模型服务</div>
        <div className="settings-grid">
          <label className="field">
            <span>服务商</span>
            <select value={provider} onChange={(event) => changeProvider(event.target.value)}>
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
            <button type="button" className="tutorial-link inline" onClick={onOpenTutorial}>
              <ExternalLink size={14} />
              还不清楚怎么获取？查看 API Key 获取教程
            </button>
            {user.apiKeyInvalid && (
              <div className="alert-error">{user.apiKeyMessage || '之前保存的 API Key 已失效，请在设置中重新填写'}</div>
            )}
          </label>
          {isCustom && (
            <label className="field">
              <span>接口地址</span>
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://example.com/v1" />
            </label>
          )}
          {isDeepSeek ? (
            <label className="field">
              <span>模型名称</span>
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                <option value="deepseek-chat">deepseek-chat（推荐，速度快）</option>
                <option value="deepseek-reasoner">deepseek-reasoner（推理更强）</option>
              </select>
            </label>
          ) : (
            <label className="field">
              <span>模型名称</span>
              <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="填写模型名称，例如 gpt-4o-mini" />
            </label>
          )}
        </div>
        <div className="action-row">
          <button className="btn btn-primary" onClick={saveApiKey} disabled={loading || testing}>
            {loading ? <Loader2 size={16} className="spin" /> : <KeyRound size={16} />}
            保存
          </button>
          <button className="btn" onClick={testConnection} disabled={loading || testing}>
            {testing ? <Loader2 size={16} className="spin" /> : <PlugZap size={16} />}
            测试连接
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => setModel(DEFAULT_MODELS[provider] || '')}
            disabled={provider === 'custom'}
          >
            <RotateCcw size={16} />
            使用默认模型
          </button>
        </div>
        <p className="muted">测试连接只会发送一小段文字，用来确认 API Key、接口地址和模型名称是否都能用。</p>
      </section>

      <section className="panel">
        <div className="section-title"><BookOpenText size={16} />讲解模式</div>
        <p className="muted">新手模式会多用比喻，逐个解释变量；进阶模式更强调结构、性能和边界情况。</p>
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
            <span>直接讲原理，关注性能、结构和边界情况</span>
          </button>
        </div>
      </section>

      <section className="panel danger-panel">
        <div className="section-title"><Trash2 size={16} />数据管理</div>
        <p className="muted">当前账号的分析记录会一直保留，直到你主动删除。</p>
        <button className="btn btn-danger" onClick={deleteAll} disabled={loading}>
          <Trash2 size={16} />
          删除全部数据
        </button>
        <div className="account-delete">
          <strong>注销账号</strong>
          <p>永久删除账号、API Key、学习历史和错题库，注销后用户名可以重新注册。</p>
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
