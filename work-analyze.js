const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/components/AnalyzePanel.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

t = t.replace(
  `export default function AnalyzePanel({ user, setUser }) {`,
  `export default function AnalyzePanel({ user, setUser, onHistoryChanged }) {`
);

t = t.replace(
  `      setSnippet({ ...data, source_code: code });
      await refreshUser();`,
  `      setSnippet({ ...data, source_code: code });
      await refreshUser();
      onHistoryChanged?.();`
);

t = t.replace(
  `        meta: \`\${data.fileCount} 个文件，\${data.totalLines} 行\`
      });
      await refreshUser();`,
  `        meta: \`\${data.fileCount} 个文件，\${data.totalLines} 行\`
      });
      await refreshUser();
      onHistoryChanged?.();`
);

if (t === before) { console.error("NO_CHANGE"); process.exit(1); }
fs.writeFileSync(p, t);
const count = (t.match(/onHistoryChanged/g) || []).length;
console.log("ANALYZE_UPDATED hooks=" + count);