const fs = require('fs');
const path = 'client/src/components/AnalyzePanel.jsx';
let t = fs.readFileSync(path, 'utf8');

// 1) 接收 initialSessionId
t = t.replace(
  "export default function AnalyzePanel({ user, setUser, onHistoryChanged }) {",
  "export default function AnalyzePanel({ user, setUser, onHistoryChanged, initialSessionId = null }) {"
);

// 2) 自动打开指定历史会话
t = t.replace(
  "  const [annotate, setAnnotate] = useState(null);\n\n  async function refreshUser() {",
  `  const [annotate, setAnnotate] = useState(null);

  useEffect(() => {
    if (!initialSessionId) return;
    setSnippet({ learning_session_id: initialSessionId, source_code: '' });
  }, [initialSessionId]);

  async function refreshUser() {`
);

// 3) 引入 useEffect
t = t.replace("import { useState } from 'react';", "import { useEffect, useState } from 'react';");

fs.writeFileSync(path, t, 'utf8');
console.log('AnalyzePanel 支持 initialSessionId');
