const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/styles.css";
let t = fs.readFileSync(p, "utf8");
t = t + `
.learning-mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 12px;
}

.details-toggle {
  justify-self: start;
  padding: 6px 12px;
  border: 1px dashed var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
}

.details-toggle:hover {
  color: var(--text);
  border-color: var(--primary);
}
`;
fs.writeFileSync(p, t);
console.log("NOVICE_CSS_ADDED");