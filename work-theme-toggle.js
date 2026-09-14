const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/pages/Dashboard.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`import { BookOpenText, History, LogOut, Settings, Wrench } from 'lucide-react';`,
`import { BookOpenText, History, LogOut, Moon, Settings, Sun, Wrench } from 'lucide-react';`
);

t = t.replace(
`  const [dueCount, setDueCount] = useState(0);`,
`  const [dueCount, setDueCount] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('daimaxuexi_theme') || 'dark');`
);

t = t.replace(
`  useEffect(() => {
    let cancelled = false;`,
`  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('daimaxuexi_theme', theme);
  }, [theme]);

  useEffect(() => {
    let cancelled = false;`
);

t = t.replace(
`          <button className="icon-btn" title="退出登录" onClick={onLogout}>
            <LogOut size={18} />
          </button>`,
`          <button
            className="theme-toggle"
            title={theme === 'dark' ? '切换到浅色' : '切换到深色'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            <span>{theme === 'dark' ? '深色' : '浅色'}</span>
          </button>
          <button className="icon-btn" title="退出登录" onClick={onLogout}>
            <LogOut size={18} />
          </button>`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("THEME_TOGGLE_ADDED");