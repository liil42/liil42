const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/components/AnalyzePanel.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`const MODES = [
  { id: 'file', label: '单个文件', icon: FileCode2 },
  { id: 'zip', label: '项目压缩包', icon: Archive },
  { id: 'paste', label: '粘贴代码', icon: ClipboardPaste },
  { id: 'folder', label: '本地文件夹', icon: FolderOpen },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'url', label: '网页', icon: Globe },
  { id: 'error', label: '报错日志', icon: Bug }
];`,
`const PRIMARY_MODES = [
  { id: 'paste', label: '粘贴代码', icon: ClipboardPaste },
  { id: 'file', label: '上传文件', icon: FileCode2 }
];

const MORE_MODES = [
  { id: 'zip', label: '项目压缩包', icon: Archive },
  { id: 'folder', label: '本地文件夹', icon: FolderOpen },
  { id: 'github', label: 'GitHub', icon: Github },
  { id: 'url', label: '网页', icon: Globe },
  { id: 'error', label: '报错日志', icon: Bug }
];

const MODES = [...PRIMARY_MODES, ...MORE_MODES];

const EXAMPLE_CODE = 'const total = price * count;';`
);

t = t.replace(
`  const [mode, setMode] = useState('file');`,
`  const [mode, setMode] = useState('paste');
  const [showMoreModes, setShowMoreModes] = useState(false);`
);

t = t.replace(
`      <nav className="mode-bar">
        {MODES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={\`mode-item \${mode === item.id ? 'active' : ''}\`}
              onClick={() => {
                setMode(item.id);
                setError('');
                setSnippet(null);
                setResult(null);
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>`,
`      <div className="analyze-hero">
        <h2>把你看不懂的代码粘进来</h2>
        <p>我会用小白能懂的方式，一行一行讲给你听。</p>
      </div>

      <nav className="mode-bar primary">
        {PRIMARY_MODES.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={\`mode-item \${mode === item.id ? 'active' : ''}\`}
              onClick={() => {
                setMode(item.id);
                setError('');
                setSnippet(null);
                setResult(null);
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className="more-modes-toggle"
        onClick={() => setShowMoreModes((current) => !current)}
      >
        {showMoreModes ? '收起更多分析方式' : '更多分析方式'}
      </button>

      {showMoreModes && (
        <nav className="mode-bar more">
          {MORE_MODES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={\`mode-item \${mode === item.id ? 'active' : ''}\`}
                onClick={() => {
                  setMode(item.id);
                  setError('');
                  setSnippet(null);
                  setResult(null);
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}`
);

t = t.replace(
`              placeholder="粘贴代码"
            />
            <button
              className="btn btn-primary"
              disabled={loading}
              onClick={() => runSnippet(pasteCode, '粘贴代码', pasteLanguage)}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Code2 size={16} />}
              开始分析
            </button>`,
`              placeholder={\`粘贴你看不懂的代码，例如：\${EXAMPLE_CODE}\`}
            />
            <div className="example-row">
              <span>示例</span>
              <button type="button" className="chip" onClick={() => setPasteCode(EXAMPLE_CODE)}>
                {EXAMPLE_CODE}
              </button>
            </div>
            <button
              className="btn btn-primary"
              disabled={loading}
              onClick={() => runSnippet(pasteCode, '粘贴代码', pasteLanguage)}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Code2 size={16} />}
              开始讲解
            </button>`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("HERO_UPDATED primary=" + (t.match(/PRIMARY_MODES/g) || []).length + " more=" + (t.match(/MORE_MODES/g) || []).length);