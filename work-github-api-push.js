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

async function buildTree(dir, base = dir) {
  const tree = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs).split(path.sep).join('/');
    if (entry.isDirectory()) {
      const subtree = await buildTree(abs, base);
      const created = await gh(`${API}/repos/${OWNER}/${REPO}/git/trees`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tree: subtree })
      });
      tree.push({ path: rel, mode: '040000', type: 'tree', sha: created.sha });
    } else if (entry.isFile()) {
      const sha = await createBlob(abs);
      tree.push({ path: rel, mode: '100644', type: 'blob', sha });
      console.log(`blob ${rel}`);
    }
  }
  return tree;
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
  const treeItems = await buildTree(process.cwd());
  const tree = await gh(`${API}/repos/${OWNER}/${REPO}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tree: treeItems })
  });
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
