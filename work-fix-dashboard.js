const fs = require('fs');
const path = 'client/src/pages/Dashboard.jsx';
let t = fs.readFileSync(path, 'utf8');

// 引入图标
t = t.replace(
  "import { BookOpenText, History, LogOut, Moon, Settings, Sun, Wrench } from 'lucide-react';",
  "import { BookOpenText, History, LogOut, Moon, RotateCcw, Settings, Sun, Wrench } from 'lucide-react';"
);

// 新增状态：继续上次学习
t = t.replace(
  "  const [theme, setTheme] = useState(() => localStorage.getItem('daimaxuexi_theme') || 'dark');",
  `  const [theme, setTheme] = useState(() => localStorage.getItem('daimaxuexi_theme') || 'dark');
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
  }`
);

// 在导航下方加继续学习入口条
t = t.replace(
  `        <section className="tab-content">`,
  `        {lastSessionId && tab === 'analyze' && (
          <button type="button" className="continue-card" onClick={continueLearning}>
            <RotateCcw size={16} />
            <span><strong>继续上次学习</strong><small>接着看上次没弄懂的代码</small></span>
          </button>
        )}

        <section className="tab-content">`
);

// 传入 initialSessionId
t = t.replace(
  "            <AnalyzePanel user={user} setUser={setUser} onHistoryChanged={markDataChanged} />",
  "            <AnalyzePanel\n              user={user}\n              setUser={setUser}\n              onHistoryChanged={markDataChanged}\n              initialSessionId={continueSessionId}\n            />"
);

fs.writeFileSync(path, t, 'utf8');
console.log('Dashboard 已加入继续上次学习');
