const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/components/LearningWorkspace.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`import { useEffect, useMemo, useState } from 'react';`,
`import { useEffect, useMemo, useState } from 'react';`
);

t = t.replace(
`function InsightBody({ insight }) {
  if (!insight) return null;
  return (
    <div className="line-insight">`,
`function InsightBody({ insight, noviceMode = true }) {
  const [showDetails, setShowDetails] = useState(false);
  if (!insight) return null;
  const advanced = !noviceMode;
  const detailsOpen = advanced || showDetails;
  return (
    <div className="line-insight">`
);

t = t.replace(
`      <div className="execution-grid">
        {insight.execution_before && (`,
`      {!advanced && (
        <button
          type="button"
          className="details-toggle"
          onClick={() => setShowDetails((current) => !current)}
        >
          {showDetails ? '收起更多细节' : '展开更多细节'}
        </button>
      )}
      {detailsOpen && (
        <>
      <div className="execution-grid">
        {insight.execution_before && (`
);

t = t.replace(
`      {Array.isArray(insight.must_know) && insight.must_know.length > 0 && (
        <div className="line-insight-block must-know">
          <strong>必须记住</strong>
          <ul>
            {insight.must_know.map((item, index) => (
              <li key={index}><HighlightedText text={item} /></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}`,
`      {Array.isArray(insight.must_know) && insight.must_know.length > 0 && (
        <div className="line-insight-block must-know">
          <strong>必须记住</strong>
          <ul>
            {insight.must_know.map((item, index) => (
              <li key={index}><HighlightedText text={item} /></li>
            ))}
          </ul>
        </div>
      )}
        </>
      )}
    </div>
  );
}`
);

// 在 LearningWorkspace 中新增新手/进阶状态并持久化
t = t.replace(
`  const [notice, setNotice] = useState('');`,
`  const [notice, setNotice] = useState('');
  const [noviceMode, setNoviceMode] = useState(() => localStorage.getItem('daimaxuexi_learning_mode') !== 'advanced');`
);

t = t.replace(
`  useEffect(() => {
    if (!sessionId) return;`,
`  useEffect(() => {
    localStorage.setItem('daimaxuexi_learning_mode', noviceMode ? 'novice' : 'advanced');
  }, [noviceMode]);

  useEffect(() => {
    if (!sessionId) return;`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("NOVICE_MODE_ADDED insights=" + (t.match(/noviceMode/g) || []).length);