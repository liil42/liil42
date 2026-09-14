const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'liil42';
const REPO = 'liil42';
const BRANCH = 'main';
const API = 'https://api.github.com';
const headers = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Codex-Deploy' };

async function gh(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    const message = data && data.message ? data.message : response.statusText;
    const error = new Error(`${response.status} ${message}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: process.cwd(), encoding: options.encoding || 'utf8', stdio: options.stdio || ['ignore', 'pipe', 'pipe'] });
}

async function createBlob(filePath) {
  const content = fs.readFileSync(filePath).toString('base64');
  const blob = await gh(`${API}/repos/${OWNER}/${REPO}/git/blobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, encoding: 'base64' })
  });
  return blob.sha;
}

async function buildTree() {
  const files = git(['ls-files']).split(/\r?\n/).filter(Boolean);
  const blobs = new Map();
  for (const rel of files) {
    const abs = path.join(process.cwd(), rel);
    if (!fs.existsSync(abs)) throw new Error('tracked file missing: ' + rel);
    const sha = await createBlob(abs);
    blobs.set(rel, sha);
  }
  const root = new Map();
  const ensureDir = (parent, name) => {
    if (!parent.has(name)) parent.set(name, { dirs: new Map(), files: new Map() });
    return parent.get(name);
  };
  for (const [rel, sha] of blobs) {
    const parts = rel.split('/');
    let node = { dirs: root, files: new Map() };
    for (let i = 0; i < parts.length - 1; i++) node = ensureDir(node.dirs, parts[i]);
    node.files.set(parts[parts.length - 1], sha);
  }
  const makeTree = async (node) => {
    const items = [];
    for (const [name, child] of node.dirs) {
      const childSha = await makeTree(child);
      items.push({ path: name, mode: '040000', type: 'tree', sha: childSha });
    }
    for (const [name, sha] of node.files) items.push({ path: name, mode: '100644', type: 'blob', sha });
    const created = await gh(`${API}/repos/${OWNER}/${REPO}/git/trees`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tree: items })
    });
    return created.sha;
  };
  return makeTree({ dirs: root, files: new Map() });
}
async function main() {
  if (!TOKEN) throw new Error('缺少 GITHUB_TOKEN');
  const status = git(['status', '--porcelain']);
  if (status.trim()) {
    console.log('存在未提交修改，先执行提交');
    git(['add', '-A']);
    try { git(['commit', '-m', 'chore: sync deploy changes']); } catch (error) { if (!String(error.stdout || error.message).includes('nothing to commit')) throw error; }
  }
  const head = git(['rev-parse', 'HEAD']).trim();
  const commitMessage = git(['log', '-1', '--pretty=%B']).trim();
  const authorName = git(['log', '-1', '--pretty=%an']).trim();
  const authorEmail = git(['log', '-1', '--pretty=%ae']).trim();
  console.log(`local_head=${head}`);
  const remoteRef = await gh(`${API}/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`).catch((error) => (error.status === 404 || error.status === 409) ? null : Promise.reject(error));
  const parentShas = remoteRef ? [remoteRef.object.sha] : [];
  const treeSha = await buildTree();
  const tree = { sha: treeSha };
  const commit = await gh(`${API}/repos/${OWNER}/${REPO}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: commitMessage || 'deploy', tree: tree.sha, parents: parentShas, author: { name: authorName, email: authorEmail, date: new Date().toISOString() }, committer: { name: authorName, email: authorEmail, date: new Date().toISOString() } })
  });
  if (remoteRef) {
    await gh(`${API}/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sha: commit.sha, force: false }) });
  } else {
    await gh(`${API}/repos/${OWNER}/${REPO}/git/refs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: commit.sha }) });
  }
  console.log(JSON.stringify({ repository: `https://github.com/${OWNER}/${REPO}`, pages: `https://${OWNER}.github.io/${REPO}/`, commit: commit.sha, tree: tree.sha }, null, 2));
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
