import { useState } from 'react';
import { BookOpenText, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { api } from '../api';

export default function LoginPage({ onLogin, backendDown = false }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-brand">
        <div className="brand-mark"><BookOpenText size={30} /></div>
        <h1>代码理解导师</h1>
        <p>面向小白的代码解析与项目体检工具</p>
      </div>
      <form className="auth-panel" onSubmit={handleSubmit}>
        <div className="auth-title">
          {mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
          <h2>{mode === 'login' ? '登录' : '注册'}</h2>
        </div>
        <label className="field">
          <span>用户名</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="用户名"
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 6 位"
            autoComplete="current-password"
          />
        </label>
        {backendDown && !error && (
          <div className="alert-error">后端服务没有启动，请先启动后端再登录。</div>
        )}
        {error && <div className="alert-error">{error}</div>}
        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? '请稍候' : mode === 'login' ? '登录' : '注册'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? '没有账号，去注册' : '已有账号，去登录'}
        </button>
        <div className="privacy-note">
          <KeyRound size={14} />
          <span>代码仅用于当前账号的分析任务，可在设置中删除全部数据。</span>
        </div>
      </form>
    </div>
  );
}
