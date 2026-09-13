const fs = require("fs");
const files = [
  "client/src/components/LearningWorkspace.jsx",
  "client/src/components/HistoryPanel.jsx",
  "client/src/components/MistakePanel.jsx",
  "client/src/components/HighlightedText.jsx",
  "client/src/components/SnippetResult.jsx"
];
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  console.log("=== " + f + " ===");
  console.log("bytes=" + Buffer.byteLength(t) + " lines=" + t.split("\n").length);
  const bad = /[\uFFFD]/.test(t);
  console.log("replacementChar=" + bad);
}