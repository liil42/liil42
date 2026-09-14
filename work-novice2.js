const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/components/LearningWorkspace.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`            {loading && <div className="learning-loading"><Loader2 size={18} className="spin" />正在拆解这一行</div>}
            <InsightBody insight={currentInsight?.insight} />`,
`            {loading && <div className="learning-loading"><Loader2 size={18} className="spin" />正在拆解这一行</div>}
            <div className="learning-mode-switch">
              <span>讲解方式</span>
              <button
                type="button"
                className={\`chip \${noviceMode ? 'active' : ''}\`}
                onClick={() => setNoviceMode(true)}
              >
                新手模式
              </button>
              <button
                type="button"
                className={\`chip \${!noviceMode ? 'active' : ''}\`}
                onClick={() => setNoviceMode(false)}
              >
                进阶模式
              </button>
            </div>
            <InsightBody insight={currentInsight?.insight} noviceMode={noviceMode} />`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("SWITCH_WIRED");