const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/styles.css";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`:root {
  --bg: #f4f7fb;
  --surface: #ffffff;
  --surface-2: #f8fafc;
  --border: #dbe2ea;
  --text: #1f2a37;
  --muted: #6b7280;
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --success: #15803d;
  --danger: #b91c1c;
  --warning: #b45309;
  --code-bg: #111827;
  --code-text: #e5e7eb;
  --shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}`,
`:root {
  --bg: #070d1b;
  --bg-soft: #0b1425;
  --surface: #101b30;
  --surface-2: #0c1626;
  --border: #1e2f4a;
  --text: #e6edf7;
  --muted: #92a4c0;
  --primary: #38bdf8;
  --primary-dark: #0ea5e9;
  --accent-2: #7dd3fc;
  --success: #34d399;
  --danger: #fb7185;
  --warning: #fbbf24;
  --code-bg: #060b16;
  --code-text: #dbeafe;
  --shadow: 0 18px 44px rgba(2, 6, 23, 0.55);
  --glow: 0 0 0 1px rgba(56, 189, 248, 0.22), 0 0 28px rgba(56, 189, 248, 0.18);
}

html[data-theme="light"] {
  --bg: #f4f7fb;
  --bg-soft: #eef3f9;
  --surface: #ffffff;
  --surface-2: #f8fafc;
  --border: #dbe2ea;
  --text: #1f2a37;
  --muted: #6b7280;
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --accent-2: #0ea5e9;
  --success: #15803d;
  --danger: #dc2626;
  --warning: #b45309;
  --code-bg: #0f172a;
  --code-text: #e5e7eb;
  --shadow: 0 10px 26px rgba(15, 23, 42, 0.1);
  --glow: 0 0 0 1px rgba(37, 99, 235, 0.16), 0 0 22px rgba(37, 99, 235, 0.12);
}`
);

t = t + `
body {
  background-image:
    radial-gradient(1000px 520px at 12% -10%, rgba(56, 189, 248, 0.16), transparent 60%),
    radial-gradient(760px 420px at 92% 8%, rgba(129, 140, 248, 0.14), transparent 60%);
  background-attachment: fixed;
}

html[data-theme="light"] body {
  background-image:
    radial-gradient(900px 480px at 10% -10%, rgba(37, 99, 235, 0.1), transparent 60%),
    radial-gradient(700px 400px at 92% 6%, rgba(14, 165, 233, 0.08), transparent 60%);
}

.panel,
.report-panel,
.modal,
.auth-panel,
.history-list,
.mistake-list,
.mistake-detail {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.panel,
.report-panel {
  box-shadow: var(--shadow);
}

.topbar {
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}

.mode-item,
.tab {
  border-color: var(--border);
  background: var(--surface-2);
  color: var(--muted);
}

.mode-item.active,
.tab.active {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 18%, var(--surface));
  color: var(--text);
  box-shadow: var(--glow);
}

.chip {
  border-color: var(--border);
  background: var(--surface-2);
  color: var(--muted);
}

.chip.active {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 18%, var(--surface));
  color: var(--text);
}

.code-block,
.code-lines {
  background: var(--code-bg);
  color: var(--code-text);
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12px;
}

.theme-toggle:hover {
  color: var(--text);
  border-color: var(--primary);
}
`;

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("DARK_THEME_ADDED");