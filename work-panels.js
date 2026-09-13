const fs = require("fs");

// HistoryPanel: 支持外部刷新键 + 分类操作成功提示
let h = "F:/AI-codex/daimaxuexi/client/src/components/HistoryPanel.jsx";
let t = fs.readFileSync(h, "utf8");
const h0 = t;

t = t.replace(
  `export default function HistoryPanel() {`,
  `export default function HistoryPanel({ refreshKey = 0 }) {`
);
t = t.replace(
  `  const [error, setError] = useState('');

  async function load() {`,
  `  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {`
);
t = t.replace(
  `  useEffect(() => {
    load();
  }, []);`,
  `  useEffect(() => {
    load();
  }, [refreshKey]);`
);
t = t.replace(
  `      setNewCategory('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }`,
  `      setNewCategory('');
      setNotice('分类已创建');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }`
);
t = t.replace(
  `      if (activeCategory === id) setActiveCategory('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }`,
  `      if (activeCategory === id) setActiveCategory('');
      setNotice('分类已删除，历史记录仍然保留');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }`
);
t = t.replace(
  `      await api(\`/api/learning/sessions/\${sessionId}/category\`, {
        method: 'PUT',
        body: JSON.stringify({ categoryId: categoryId || null })
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }`,
  `      await api(\`/api/learning/sessions/\${sessionId}/category\`, {
        method: 'PUT',
        body: JSON.stringify({ categoryId: categoryId || null })
      });
      setNotice(categoryId ? '已更新分类' : '已取消分类');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }`
);
t = t.replace(
  `      {error && <div className="alert-error">{error}</div>}
      <div className="history-layout">`,
  `      {notice && <div className="alert-success">{notice}</div>}
      {error && <div className="alert-error">{error}</div>}
      <div className="history-layout">`
);

if (t === h0) { console.error("HISTORY_NO_CHANGE"); process.exit(1); }
fs.writeFileSync(h, t);
console.log("HISTORY_UPDATED");

// MistakePanel: 支持外部刷新键 + 操作成功/失败提示
let m = "F:/AI-codex/daimaxuexi/client/src/components/MistakePanel.jsx";
let mt = fs.readFileSync(m, "utf8");
const m0 = mt;

mt = mt.replace(
  `export default function MistakePanel() {`,
  `export default function MistakePanel({ refreshKey = 0 }) {`
);
mt = mt.replace(
  `  const [error, setError] = useState('');

  async function load() {`,
  `  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {`
);
mt = mt.replace(
  `  useEffect(() => {
    load();
  }, [status, categoryId, itemType]);`,
  `  useEffect(() => {
    load();
  }, [status, categoryId, itemType, refreshKey]);`
);
mt = mt.replace(
  `  async function review(item) {
    await api(\`/api/mistakes/\${item.id}/review\`, { method: 'POST' });
    await load();
  }`,
  `  async function review(item) {
    setError('');
    try {
      await api(\`/api/mistakes/\${item.id}/review\`, { method: 'POST' });
      setNotice('已记录一次复习');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }`
);
mt = mt.replace(
  `  async function resolve(item) {
    await api(\`/api/mistakes/\${item.id}\`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'resolved' })
    });
    await load();
  }`,
  `  async function resolve(item) {
    setError('');
    try {
      await api(\`/api/mistakes/\${item.id}\`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'resolved' })
      });
      setNotice('已标记为掌握');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }`
);
mt = mt.replace(
  `  async function remove(item) {
    if (!window.confirm('删除这道错题吗？')) return;
    await api(\`/api/mistakes/\${item.id}\`, { method: 'DELETE' });
    if (active?.id === item.id) setActive(null);
    await load();
  }`,
  `  async function remove(item) {
    if (!window.confirm('删除这道错题吗？')) return;
    setError('');
    try {
      await api(\`/api/mistakes/\${item.id}\`, { method: 'DELETE' });
      if (active?.id === item.id) setActive(null);
      setNotice('错题已删除');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }`
);
mt = mt.replace(
  `      {error && <div className="alert-error">{error}</div>}
      <div className="mistake-layout">`,
  `      {notice && <div className="alert-success">{notice}</div>}
      {error && <div className="alert-error">{error}</div>}
      <div className="mistake-layout">`
);

if (mt === m0) { console.error("MISTAKE_NO_CHANGE"); process.exit(1); }
fs.writeFileSync(m, mt);
console.log("MISTAKE_UPDATED");