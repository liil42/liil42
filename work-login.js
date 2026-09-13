const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/pages/LoginPage.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');`,
`export default function LoginPage({ onLogin, backendDown = false }) {
  const [mode, setMode] = useState('login');`
);

t = t.replace(
`        {error && <div className="alert-error">{error}</div>}`,
`        {backendDown && !error && (
          <div className="alert-error">
            后端服务没有启动，请先运行 npm run dev 后再登录。
          </div>
        )}
        {error && <div className="alert-error">{error}</div>}`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("LOGIN_UPDATED");