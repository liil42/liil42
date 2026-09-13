const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/styles.css";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t + `
.analyze-hero {
  display: grid;
  gap: 6px;
}

.analyze-hero h2 {
  margin: 0;
  font-size: 20px;
}

.analyze-hero p {
  margin: 0;
  color: var(--muted);
}

.mode-bar.primary {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mode-bar.more {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.more-modes-toggle {
  justify-self: start;
  padding: 6px 12px;
  border: 1px dashed var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
}

.more-modes-toggle:hover {
  color: var(--text);
  border-color: var(--primary);
}

.example-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--muted);
  font-size: 12px;
}

@media (max-width: 900px) {
  .mode-bar.more {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
`;

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("HERO_CSS_ADDED");