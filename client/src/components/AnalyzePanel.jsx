import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import {
  Archive,
  BookOpenCheck,
  Bug,
  Check,
  ClipboardPaste,
  Code2,
  Download,
  FileCode2,
  FilePenLine,
  FolderOpen,
  Globe,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';
import MarkdownView from './MarkdownView';
import SnippetResult from './SnippetResult';
import LoadingView from './LoadingView';

const MORE_MODES = [
  { id: 'file', label: '上传文件', icon: FileCode2 },
  { id: 'zip', label: '项目压缩包', icon: Archive },
  { id: 'folder', label: '本地文件夹', icon: FolderOpen },
  { id: 'url', label: '网页地址', icon: Globe },
  { id: 'error', label: '报错日志', icon: Bug }
];

const EXAMPLE_CODE = 'const total = price * count;';
const BINARY_EXT = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot|pdf|zip|rar|7z|tar|gz|mp4|mp3|exe|dll|so|dylib|class|jar|pyc)$/i;

function isTextFile(name) {
  return !BINARY_EXT.test(name);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AnalyzePanel({ user, setUser, onHistoryChanged, initialSessionId = null, onOpenMistakes, onOpenTutorial }) {
  const [mode, setMode] = useState('paste');
  const [showMoreModes, setShowMoreModes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snippet, setSnippet] = useState(null);
  const [result, setResult] = useState(null);
  const [pasteCode, setPasteCode] = useState('');
  const [pasteLanguage, setPasteLanguage] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [pageText, setPageText] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [errorLog, setErrorLog] = useState('');
  const [localFiles, setLocalFiles] = useState([]);
  const [localHandles, setLocalHandles] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [annotate, setAnnotate] = useState(null);

  useEffect(() => {
    if (!initialSessionId) return;
    setSnippet({ learning_session_id: initialSessionId, source_code: '' });
  }, [initialSessionId]);

  async function refreshUser() {
    const data = await api('/api/me');
    setUser(data.user);
  }

  async function runSnippet(code, filename, language) {
    if (!code.trim()) {
      setError('先粘贴或上传代码，再让我讲。');
      return;
    }
    setError('');
    setResult(null);
    setSnippet(null);
    setLoading(true);
    try {
      const data = await api('/api/analyze/snippet', {
        method: 'POST',
        body: JSON.stringify({ code, language: language || '', style: '' })
      });
      setSnippet({ ...data, source_code: code });
      await refreshUser();
      onHistoryChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runProject(files, title, sourceType = 'project') {
    if (!files.length) {
      setError('没有可以分析的文字文件。');
      return;
    }
    setError('');
    setResult(null);
    setSnippet(null);
    setLoading(true);
    try {
      const data = await api('/api/analyze/project', {
        method: 'POST',
        body: JSON.stringify({ files, focus: '', title, sourceType })
      });
      setResult({
        kind: 'report',
        title,
        report: data.report,
        meta: `${data.fileCount} 个文件，${data.totalLines} 行`
      });
      await refreshUser();
      onHistoryChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSingleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('单个文件不能超过 2MB。');
      return;
    }
    const text = await file.text();
    const language = file.name.split('.').pop() || '';
    await runSnippet(text, file.name, language);
  }

  async function handleZipFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError('项目压缩包不能超过 50MB。');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const entries = [];
      zip.forEach((relativePath, entry) => {
        if (!entry.dir && isTextFile(relativePath)) entries.push({ path: relativePath, entry });
      });
      if (entries.length === 0) throw new Error('压缩包里没有文字文件。');
      const files = [];
      let totalChars = 0;
      for (const item of entries.slice(0, 200)) {
        const content = await item.entry.async('string');
        totalChars += content.length;
        if (totalChars > 8 * 1024 * 1024) throw new Error('解压后的项目超过 8MB。');
        files.push({ path: item.path, content });
      }
      setLoading(false);
      await runProject(files, file.name, 'zip');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function selectLocalFolder() {
    if (!('showDirectoryPicker' in window)) {
      setError('本地文件夹写入需要 Chrome 或 Edge。');
      return;
    }
    setError('');
    setSnippet(null);
    setResult(null);
    setLoading(true);
    try {
      const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
      const handles = [];

      async function walk(current, prefix) {
        for await (const entry of current.values()) {
          const path = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.kind === 'file' && isTextFile(path)) {
            handles.push({ path, handle: entry });
          } else if (entry.kind === 'directory') {
            await walk(entry, path);
          }
        }
      }

      await walk(directory, '');
      if (handles.length === 0) throw new Error('没有找到可以分析的文字文件。');
      if (handles.length > 200) throw new Error('项目文件超过 200 个，请选择更小的文件夹。');

      const files = [];
      let totalChars = 0;
      for (const item of handles) {
        const file = await item.handle.getFile();
        const content = await file.text();
        totalChars += content.length;
        if (totalChars > 8 * 1024 * 1024) throw new Error('项目总大小超过 8MB。');
        files.push({ path: item.path, content });
      }

      setLocalHandles(handles);
      setLocalFiles(files);
      setSelectedPath(files[0].path);
      setAnnotate(null);
      setLoading(false);
      await runProject(files, '本地项目', 'folder');
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message);
      setLoading(false);
    }
  }

  async function handleAnnotate() {
    const file = localFiles.find((item) => item.path === selectedPath);
    if (!file) return;
    setError('');
    setAnnotate({ path: file.path, original: file.content, annotated: '', loading: true });
    try {
      const data = await api('/api/analyze/annotate', {
        method: 'POST',
        body: JSON.stringify({ code: file.content, language: file.path.split('.').pop() || '', filename: file.path })
      });
      setAnnotate({ path: file.path, original: file.content, annotated: data.annotated_code, loading: false });
      await refreshUser();
    } catch (err) {
      setError(err.message);
      setAnnotate(null);
    }
  }

  async function handleWriteLocal() {
    if (!annotate || !annotate.annotated) return;
    const handle = localHandles.find((item) => item.path === annotate.path)?.handle;
    if (!handle) {
      setError('浏览器没有保留写入权限，请重新选择本地文件夹。');
      return;
    }
    try {
      const writable = await handle.createWritable();
      await writable.write(annotate.annotated);
      await writable.close();
      setAnnotate(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUrl() {
    if (!pageUrl.trim()) {
      setError('请输入网页地址。');
      return;
    }
    setError('');
    setResult(null);
    setSnippet(null);
    setLoading(true);
    try {
      const data = await api('/api/analyze/url', {
        method: 'POST',
        body: JSON.stringify({ url: pageUrl, pageText })
      });
      setResult({
        kind: 'report',
        title: data.pageTitle || pageUrl,
        report: data.report,
        meta: '网页结构、功能流程和优化建议'
      });
      await refreshUser();
      onHistoryChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleErrorAnalysis() {
    if (!errorLog.trim()) {
      setError('请先把报错内容粘贴进来；如果能补充相关代码，分析会更准。');
      return;
    }
    setError('');
    setResult(null);
    setSnippet(null);
    setLoading(true);
    try {
      const data = await api('/api/analyze/error', {
        method: 'POST',
        body: JSON.stringify({ code: errorCode, log: errorLog })
      });
      setResult({ kind: 'report', title: '报错日志分析', report: data.report, meta: '快速修复 + 根本原因' });
      await refreshUser();
      onHistoryChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="analyze-layout">
      <div className="analyze-hero">
        <h2>把你看不懂的代码粘进来</h2>
        <p>我会用小白能懂的方式，一行一行讲给你听。</p>
      </div>

      <div className="primary-actions">
        <button
          type="button"
          className={`primary-action ${mode === 'paste' ? 'active' : ''}`}
          onClick={() => { setMode('paste'); setError(''); setSnippet(null); setResult(null); }}
        >
          <ClipboardPaste size={22} />
          <strong>帮我讲懂这段代码</strong>
          <span>粘贴代码，先看整体，再逐行问明白</span>
        </button>
        <button type="button" className="primary-action" onClick={onOpenMistakes}>
          <BookOpenCheck size={22} />
          <strong>我哪里没学会</strong>
          <span>查看错题，复习还没掌握的知识</span>
        </button>
      </div>

      <button
        type="button"
        className="more-modes-toggle"
        onClick={() => setShowMoreModes((current) => !current)}
      >
        <Plus size={15} />
        {showMoreModes ? '收起更多分析方式' : '更多分析方式：文件、项目、网页地址、报错日志'}
      </button>

      {showMoreModes && (
        <nav className="mode-bar more">
          {MORE_MODES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`mode-item ${mode === item.id ? 'active' : ''}`}
                onClick={() => {
                  setMode(item.id);
                  setError('');
                  setSnippet(null);
                  setResult(null);
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div className="input-panel">
        {mode === 'file' && (
          <label className="drop-zone">
            <FileCode2 size={24} />
            <span>选择代码文件</span>
            <input type="file" onChange={handleSingleFile} />
          </label>
        )}

        {mode === 'zip' && (
          <label className="drop-zone">
            <Archive size={24} />
            <span>选择项目压缩包</span>
            <input type="file" accept=".zip" onChange={handleZipFile} />
          </label>
        )}

        {mode === 'paste' && (
          <div className="stack">
            <div className="field-row">
              <label className="field">
                <span>语言</span>
                <input
                  value={pasteLanguage}
                  onChange={(event) => setPasteLanguage(event.target.value)}
                  placeholder="例如 javascript"
                />
              </label>
            </div>
            <textarea
              className="code-textarea"
              rows={14}
              value={pasteCode}
              onChange={(event) => setPasteCode(event.target.value)}
              placeholder={`粘贴你看不懂的代码，例如：\n${EXAMPLE_CODE}`}
            />
            <div className="example-row">
              <span>示例</span>
              <button type="button" className="chip" onClick={() => { setPasteCode(EXAMPLE_CODE); setPasteLanguage('javascript'); setError(''); }}>
                {EXAMPLE_CODE}
              </button>
            </div>
            <button
              className="btn btn-primary"
              disabled={loading}
              onClick={() => runSnippet(pasteCode, '粘贴代码', pasteLanguage)}
            >
              {loading ? <Loader2 size={16} className="spin" /> : <Code2 size={16} />}
              开始讲给我听
            </button>
            <button type="button" className="tutorial-link inline" onClick={onOpenTutorial}>
              <KeyRound size={14} />
              还没有 API Key？查看获取教程
            </button>
          </div>
        )}

        {mode === 'folder' && (
          <div className="stack">
            <button className="btn btn-primary" onClick={selectLocalFolder} disabled={loading}>
              <FolderOpen size={16} />
              选择本地文件夹
            </button>
            {localFiles.length > 0 && (
              <div className="local-files">
                <div className="section-title"><FilePenLine size={16} />本地文件</div>
                <select value={selectedPath} onChange={(event) => setSelectedPath(event.target.value)}>
                  {localFiles.map((file) => (
                    <option key={file.path} value={file.path}>{file.path}</option>
                  ))}
                </select>
                <div className="action-row">
                  <button className="btn" onClick={handleAnnotate} disabled={!selectedPath || annotate?.loading}>
                    <RefreshCw size={16} />
                    生成注释版
                  </button>
                  {annotate?.annotated && (
                    <button className="btn btn-success" onClick={handleWriteLocal}>
                      <Check size={16} />
                      写入文件
                    </button>
                  )}
                </div>
              </div>
            )}
            {annotate?.annotated && (
              <div className="annotate-preview">
                <div className="section-title">注释预览</div>
                <pre className="code-block">{annotate.annotated}</pre>
              </div>
            )}
          </div>
        )}

        {mode === 'url' && (
          <div className="stack">
            <label className="field">
              <span>网页地址</span>
              <input
                value={pageUrl}
                onChange={(event) => setPageUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </label>
            <p className="muted">先尝试自动读取。如果服务器读不到这个网页，请把网页里能看到的主要文字粘在下面，一样可以分析。</p>
            <textarea className="code-textarea" rows={5} value={pageText} onChange={(event) => setPageText(event.target.value)} placeholder="选填：网页的标题、正文、功能菜单、操作流程文字" />
            <button className="btn btn-primary" onClick={handleUrl} disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : <Globe size={16} />}
              分析这个网页
            </button>
          </div>
        )}

        {mode === 'error' && (
          <div className="stack">
            <p className="muted">不用整理格式，直接把浏览器或终端里的整段报错原样粘贴到下面即可。相关代码可以不填；如果一起粘贴，分析会更准确。</p>
            <textarea
              className="code-textarea log"
              rows={10}
              value={errorLog}
              onChange={(event) => setErrorLog(event.target.value)}
              placeholder="直接粘贴完整报错，例如：Cannot read properties of undefined..."
            />
            <textarea
              className="code-textarea"
              rows={6}
              value={errorCode}
              onChange={(event) => setErrorCode(event.target.value)}
              placeholder="选填：粘贴报错相关的代码"
            />
            <button className="btn btn-primary" onClick={handleErrorAnalysis} disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : <Bug size={16} />}
              帮我看懂这个报错
            </button>
          </div>
        )}
      </div>

      {error && <div className="alert-error">{error}</div>}
      {loading && <LoadingView text="正在调用模型分析" />}

      {result?.kind === 'report' && (
        <div className="report-panel">
          <div className="report-header">
            <div>
              <h2>{result.title}</h2>
              <span>{result.meta}</span>
            </div>
            <button className="btn" onClick={() => downloadText('分析报告.md', result.report)}>
              <Download size={16} />
              下载报告
            </button>
          </div>
          <MarkdownView content={result.report} />
        </div>
      )}

      {annotate?.annotated && (
        <div className="action-row">
          <button className="btn" onClick={() => downloadText(`${annotate.path}.annotated.txt`, annotate.annotated)}>
            <Download size={16} />
            下载注释版
          </button>
        </div>
      )}

      {snippet && (
        <SnippetResult
          data={snippet}
          user={user}
          onHistoryChanged={onHistoryChanged}
        />
      )}
    </div>
  );
}
