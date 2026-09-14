const fs = require("fs");

const p = "F:/AI-codex/daimaxuexi/client/src/components/HighlightedText.jsx";
const content = `const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch',
  'case', 'break', 'continue', 'class', 'new', 'this', 'try', 'catch', 'finally',
  'throw', 'async', 'await', 'import', 'export', 'from', 'default', 'extends',
  'typeof', 'instanceof', 'null', 'undefined', 'true', 'false'
]);

const TOKEN_PATTERN = /([\\u4e00-\\u9fa5]+|[A-Za-z_$][\\w$]*|\\d+(?:\\.\\d+)?|[()[\\]{}.,;:+\\-*/%=<>!&|?]+|\\s+)/g;

export default function HighlightedText({ text, forceHighlight = false, maxPrimary = 4 }) {
  const value = String(text || '');
  if (!value) return null;

  const parts = value.split(TOKEN_PATTERN).filter((part) => part !== undefined && part !== null && part !== '');
  const primaryUsed = { count: 0 };

  function classify(part) {
    if (/^[\\s]+$/.test(part)) return 'plain';
    if (/^[\\u4e00-\\u9fa5]+$/.test(part)) return 'plain';
    if (KEYWORDS.has(part)) return 'primary';
    if (/^[A-Za-z_$][\\w$]*$/.test(part)) {
      if (forceHighlight) return 'primary';
      return null;
    }
    return 'secondary';
  }

  return parts.map((part, index) => {
    const kind = classify(part);
    if (kind === 'plain') return part;
    if (kind === 'secondary') {
      return <mark className="learning-token secondary" key={index}>{part}</mark>;
    }
    if (kind === 'primary') {
      if (primaryUsed.count < maxPrimary) {
        primaryUsed.count += 1;
        return <mark className="learning-token primary" key={index}>{part}</mark>;
      }
      return <mark className="learning-token secondary" key={index}>{part}</mark>;
    }
    if (forceHighlight) {
      return <mark className="learning-token primary" key={index}>{part}</mark>;
    }
    return <mark className="learning-token secondary" key={index}>{part}</mark>;
  });
}
`;
fs.writeFileSync(p, content);
console.log("HIGHLIGHT_REWRITTEN");

const c = "F:/AI-codex/daimaxuexi/client/src/styles.css";
let css = fs.readFileSync(c, "utf8");
css = css.replace(
`.learning-token {
  padding: 0 1px;
  background: transparent;
  color: var(--danger);
  font-weight: 800;
}`,
`.learning-token {
  padding: 0 2px;
  border-radius: 3px;
}

.learning-token.primary {
  background: rgba(244, 63, 94, 0.16);
  color: var(--danger);
  font-weight: 800;
}

.learning-token.secondary {
  background: rgba(56, 189, 248, 0.12);
  color: var(--accent-2, #0ea5e9);
  font-weight: 500;
}`
);
fs.writeFileSync(c, css);
console.log("HIGHLIGHT_CSS_UPDATED");