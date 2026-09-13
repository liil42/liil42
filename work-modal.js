const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/styles.css";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
`.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
}

.modal {
  width: min(720px, 100%);
  max-height: min(760px, 90vh);
  overflow: auto;
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow);
}`,
`html {
  scrollbar-gutter: stable;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: auto;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(4px);
}

.modal {
  width: min(720px, 100%);
  max-width: 100%;
  max-height: calc(100dvh - 48px);
  overflow: auto;
  margin: auto;
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow);
}`
);

t = t.replace(
`.learning-modal {
  width: min(1180px, 96vw);
}`,
`.learning-modal {
  width: min(1180px, calc(100vw - 48px));
  max-width: calc(100vw - 48px);
}`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("MODAL_CENTERED");