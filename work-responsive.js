const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/styles.css";
let t = fs.readFileSync(p, "utf8");
const before = t;

const addition = `
@media (max-width: 1280px) {
  .learning-modal {
    width: calc(100vw - 32px);
    max-width: calc(100vw - 32px);
  }
}

@media (max-width: 900px) {
  .learning-modal {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
  }

  .learning-layout {
    grid-template-columns: minmax(0, 1fr);
    max-height: none;
    min-height: 0;
  }

  .learning-code,
  .learning-detail {
    overflow: visible;
  }
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 12px;
    align-items: flex-start;
  }

  .modal {
    max-height: calc(100dvh - 24px);
  }

  .learning-modal {
    width: 100%;
    max-width: 100%;
  }

  .code-line {
    grid-template-columns: 34px minmax(0, 1fr);
    font-size: 12px;
  }
}
`;

t = t + addition;
if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
console.log("RESPONSIVE_ADDED media=" + (t.match(/@media/g) || []).length);