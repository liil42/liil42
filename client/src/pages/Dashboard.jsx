import { Suspense, lazy, useEffect, useState } from 'react';
import { BookOpenText, History, LogOut, Moon, RotateCcw, Settings, Sun, Wrench } from 'lucide-react';
import AnalyzePanel from '../components/AnalyzePanel';
import { api } from '../api';

const HistoryPanel = lazy(() => import('../components/HistoryPanel'));
const MistakePanel = lazy(() => import('../components/MistakePanel'));
const SettingsPanel = lazy(() => import('../components/SettingsPanel'));

const TABS = [
  { id: 'analyze', label: '帮我讲懂代码', icon: BookOpenText },
  { id: 'history', label: '继续上次学习', icon: History },
  { id: 'mistakes', label: '我哪里没学会', icon: Wrench },
  { id: 'settings', label: '设置', icon: Settings }
];

export default function Dashboard({ user, setUser, onLogout, onOpenTutorial }) {
  const [tab, setTab] = useState('analyze');
  const [dataVersion, setDataVersion] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('daimaxuexi_theme') || 'dark');
  const [lastSessionId, setLastSessionId] = useState(null);
  const [continueSessionId, setContinueSessionId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api('/api/learning/sessions')
      .then((data) => {
        if (!cancelled) setLastSessionId((data.sessions || [])[0]?.id || null);
      })
      .catch(() => {
        if (!cancelled) setLastSessionId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  function continueLearning() {
    if (!lastSessionId) return;
    setTab('analyze');
    setContinueSessionId(lastSessionId);
  }

  function markDataChanged() {
    setDataVersion((current) => current + 1);
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('daimaxuexi_theme', theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    api('/api/mistakes/due/count')
      .then((data) => {
        if (!cancelled) setDueCount(data.count || 0);
      })
      .catch(() => {
        if (!cancelled) setDueCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark small"><BookOpenText size={20} /></div>
          <strong>代码理解导师</strong>
        </div>
        <div className="topbar-user">
          <span>{user.username}</span>
          <span className={`member-badge ${user.isMember ? 'member' : ''}`}>
            {user.isMember ? '永久会员' : `今日 ${user.todayUsed}/3`}
          </span>
          <button
            className="theme-toggle"
            title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{theme === 'dark' ? '深色' : '浅色'}</span>
          </button>
          <button className="icon-btn" title="退出登录" onClick={onLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="main">
        <nav className="tabs">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`tab ${tab === item.id ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.id === 'mistakes' && dueCount > 0 && (
                  <span className="tab-badge">{dueCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {lastSessionId && tab === 'analyze' && (
          <button type="button" className="continue-card" onClick={continueLearning}>
            <RotateCcw size={16} />
            <span><strong>继续上次学习</strong><small>接着看上次没弄懂的代码</small></span>
          </button>
        )}

        <section className="tab-content">
          <Suspense fallback={<div className="boot-screen">正在加载面板</div>}>
          {tab === 'analyze' && (
            <AnalyzePanel
              user={user}
              setUser={setUser}
              onHistoryChanged={markDataChanged}
              initialSessionId={continueSessionId}
              onOpenMistakes={() => setTab('mistakes')}
              onOpenTutorial={onOpenTutorial}
            />
          )}
          {tab === 'history' && <HistoryPanel refreshKey={dataVersion} />}
          {tab === 'mistakes' && <MistakePanel refreshKey={dataVersion} />}
          {tab === 'settings' && <SettingsPanel user={user} setUser={setUser} onLogout={onLogout} onOpenTutorial={onOpenTutorial} />}
          </Suspense>
        </section>
      </main>
    </div>
  );
}
