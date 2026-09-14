const fs = require("fs");

// Dashboard: 顶栏显示今日待复习数量
const p = "F:/AI-codex/daimaxuexi/client/src/pages/Dashboard.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`import { useState } from 'react';`,
`import { useEffect, useState } from 'react';`
);
t = t.replace(
`import SettingsPanel from '../components/SettingsPanel';`,
`import SettingsPanel from '../components/SettingsPanel';
import { api } from '../api';`
);
t = t.replace(
`  const [dataVersion, setDataVersion] = useState(0);`,
`  const [dataVersion, setDataVersion] = useState(0);
  const [dueCount, setDueCount] = useState(0);`
);
t = t.replace(
`  function markDataChanged() {
    setDataVersion((current) => current + 1);
  }`,
`  function markDataChanged() {
    setDataVersion((current) => current + 1);
  }

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
  }, [dataVersion]);`
);
t = t.replace(
`          {tab === 'mistakes' && <MistakePanel refreshKey={dataVersion} />}`,
`          {tab === 'mistakes' && <MistakePanel refreshKey={dataVersion} />}`
);
t = t.replace(
`            <Icon size={16} />
                <span>{item.label}</span>`,
`            <Icon size={16} />
                <span>{item.label}</span>`
);
t = t.replace(
`                <span>{item.label}</span>
              </button>`,
`                <span>{item.label}</span>
                {item.id === 'mistakes' && dueCount > 0 && (
                  <span className="tab-badge">{dueCount}</span>
                )}
              </button>`
);

if (t === before) { console.error("DASH_NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("DASH_DUE_BADGE");

// CSS
const c = "F:/AI-codex/daimaxuexi/client/src/styles.css";
let css = fs.readFileSync(c, "utf8");
css = css + `
.tab-badge {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.due-badge {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(244, 63, 94, 0.14);
  color: var(--danger);
  font-size: 12px;
  font-weight: 600;
}

.review-panel {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.practice-box,
.review-panel {
  border-top: 1px solid var(--border);
}

.practice-types {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.practice-question {
  margin: 0;
  font-weight: 600;
}

.practice-feedback {
  display: grid;
  gap: 10px;
}
`;
fs.writeFileSync(c, css);
console.log("REVIEW_CSS_ADDED");