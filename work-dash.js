const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/pages/Dashboard.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`export default function Dashboard({ user, setUser, onLogout }) {
  const [tab, setTab] = useState('analyze');`,
`export default function Dashboard({ user, setUser, onLogout }) {
  const [tab, setTab] = useState('analyze');
  const [dataVersion, setDataVersion] = useState(0);

  function markDataChanged() {
    setDataVersion((current) => current + 1);
  }`
);

t = t.replace(
`          {tab === 'analyze' && <AnalyzePanel user={user} setUser={setUser} />}
          {tab === 'history' && <HistoryPanel />}
          {tab === 'mistakes' && <MistakePanel />}`,
`          {tab === 'analyze' && (
            <AnalyzePanel user={user} setUser={setUser} onHistoryChanged={markDataChanged} />
          )}
          {tab === 'history' && <HistoryPanel refreshKey={dataVersion} />}
          {tab === 'mistakes' && <MistakePanel refreshKey={dataVersion} />}`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("DASHBOARD_UPDATED");