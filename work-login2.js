const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/pages/LoginPage.jsx";
let t = fs.readFileSync(p, "utf8");
const broken = `        {backendDown && !error && (
          <div className="alert-error">
            后端服务没有启动，请先运行 npm run dev 后再登录。
          </div>
        )}
        {error && <div className="alert-error">{error}</div>}`;
const fixed = `        {backendDown && !error && (
          <div className="alert-error">后端服务没有启动，请先启动后端再登录。</div>
        )}
        {error && <div className="alert-error">{error}</div>}`;
if (!t.includes(broken)) { console.error("PATTERN_NOT_FOUND"); process.exit(1); }
fs.writeFileSync(p, t.replace(broken, fixed));
console.log("LOGIN_OK");