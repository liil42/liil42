const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TOKEN = process.env.GITHUB_TOKEN || '';
const OWNER = 'liil42';
const REPO = 'liil42';
const BRANCH = 'main';
const API = 'https://api.github.com';
const headers = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'Codex-Deploy' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function gh(url, options = {}, attempts = 6) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      if (!response.ok) {
        const err = new Error(`${response.status} ${data.message || response.statusText}`);
        err.status = response.status; err.data = data;
        if (response.status >= 500 || response.status === 429) throw err;
        throw Object.assign(err, { noRetry: true });
      }
      return data;
    } catch (error) {
      last = error;
      if (error.noRetry || i === attempts) throw error;
      console.log(`retry=${i} ${error.message}`);
      await sleep(Math.min(1500 * i, 8000));
    }
  }
  throw last;
}
function git(args) { return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8' }); }
async function createBlob(file) {
  const content = fs.readFileSync(file).toString('base64');
  return (await gh(`${API}/repos/${OWNER}/${REPO}/git/blobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, encoding: 'base64' }) })).sha;
}
async function makeTree(files) {
  const root = new Map();
  for (const [rel, sha] of files) {
    const parts = rel.split('/');
    let node = { dirs: root, files: new Map() };
    for (const part of parts.slice(0, -1)) {
      if (!node.dirs.has(part)) node.dirs.set(part, { dirs: new Map(), files: new Map() });
      node = node.dirs.get(part);
    }
    node.files.set(parts.at(-1), sha);
  }
  async function build(node) {
    const items = [];
    for (const [name, child] of node.dirs) items.push({ path: name, mode: '040000', type: 'tree', sha: await build(child) });
    for (const [name, sha] of node.files) items.push({ path: name, mode: '100644', type: 'blob', sha });
    return (await gh(`${API}/repos/${OWNER}/${REPO}/git/trees`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tree: items }) })).sha;
  }
  return build({ dirs: root, files: new Map() });
}
async function main() {
  if (!TOKEN) throw new Error('?? GITHUB_TOKEN');
  const status = git(['status', '--porcelain']);
  if (status.trim()) {
    git(['add', '-A']);
    try { git(['commit', '-m', 'chore: sync deploy changes']); } catch (e) { if (!String(e.stdout || e.message).includes('nothing to commit')) throw e; }
  }
  const files = git(['ls-files']).split(/\r?\n/).filter(Boolean);
  if (!files.length) throw new Error('???????????');
  console.log(`tracked_files=${files.length}`);
  const blobs = new Map();
  let done = 0;
  for (const rel of files) {
    const abs = path.join(process.cwd(), rel);
    if (!fs.existsSync(abs)) throw new Error(`?????: ${rel}`);
    blobs.set(rel, await createBlob(abs));
    done++;
    if (done % 25 === 0 || done === files.length) console.log(`blob ${done}/${files.length}`);
  }
  const tree = await makeTree(blobs);
  const remoteRef = await gh(`${API}/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`, {}, 2).catch((e) => (e.status === 404 || e.status === 409 ? null : Promise.reject(e)));
  const parents = remoteRef ? [remoteRef.object.sha] : [];
  const message = git(['log', '-1', '--pretty=%B']).trim() || 'deploy';
  const author = { name: git(['log', '-1', '--pretty=%an']).trim(), email: git(['log', '-1', '--pretty=%ae']).trim(), date: new Date().toISOString() };
  const commit = await gh(`${API}/repos/${OWNER}/${REPO}/git/commits`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, tree, parents, author, committer: author }) });
  if (remoteRef) {
    await gh(`${API}/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sha: commit.sha, force: false }) });
  } else {
    await gh(`${API}/repos/${OWNER}/${REPO}/git/refs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: commit.sha }) });
  }
  console.log(JSON.stringify({ repository: `https://github.com/${OWNER}/${REPO}`, pages: `https://${OWNER}.github.io/${REPO}/`, commit: commit.sha, tree }, null, 2));
}
main().catch((e) => { console.error(e.stack || e); process.exit(1); });
