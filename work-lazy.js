const fs = require("fs");

// 1. Dashboard 懒加载三个重面板
const p = "F:/AI-codex/daimaxuexi/client/src/pages/Dashboard.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`import { useEffect, useState } from 'react';`,
`import { Suspense, lazy, useEffect, useState } from 'react';`
);
t = t.replace(
`import AnalyzePanel from '../components/AnalyzePanel';
import HistoryPanel from '../components/HistoryPanel';
import MistakePanel from '../components/MistakePanel';
import SettingsPanel from '../components/SettingsPanel';`,
`import AnalyzePanel from '../components/AnalyzePanel';

const HistoryPanel = lazy(() => import('../components/HistoryPanel'));
const MistakePanel = lazy(() => import('../components/MistakePanel'));
const SettingsPanel = lazy(() => import('../components/SettingsPanel'));`
);
t = t.replace(
`        <section className="tab-content">
          {tab === 'analyze' && (`,
`        <section className="tab-content">
          <Suspense fallback={<div className="boot-screen">正在加载面板</div>}>
          {tab === 'analyze' && (`
);
t = t.replace(
`          {tab === 'settings' && <SettingsPanel user={user} setUser={setUser} onLogout={onLogout} />}
        </section>`,
`          {tab === 'settings' && <SettingsPanel user={user} setUser={setUser} onLogout={onLogout} />}
          </Suspense>
        </section>`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("LAZY_PANELS_ADDED");