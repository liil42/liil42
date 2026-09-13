const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'client', 'dist');
const SITE_NAME = 'daimaxuexi-liil42';
const TOKEN = process.env.NETLIFY_AUTH_TOKEN || 'nfc_ytF39GRtT8uu4yyYaFUvBUMv2bvin8Et4814';
const API = 'https://api.netlify.com/api/v1';
const headers = { Authorization: `Bearer ${TOKEN}` };

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(data).slice(0, 1000)}`);
  return data;
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs, base));
    else if (entry.isFile()) out.push({ abs, rel: '/' + path.relative(base, abs).split(path.sep).join('/') });
  }
  return out;
}

async function main() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('client/dist/index.html 不存在，请先构建');
  const sites = await request(`${API}/sites?per_page=100`);
  let site = sites.find((item) => item.name === SITE_NAME);
  if (!site) site = await request(`${API}/sites`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: SITE_NAME, account_slug: 'liil42' }) });
  const files = walk(DIST).map(({ abs, rel }) => {
    const body = fs.readFileSync(abs);
    return { abs, rel, body, sha1: crypto.createHash('sha1').update(body).digest('hex') };
  });
  const manifest = {};
  for (const file of files) manifest[file.rel] = file.sha1;
  console.log(`site=${site.ssl_url || site.url}`);
  console.log(`files=${files.length}`);
  const deploy = await request(`${API}/sites/${site.id}/deploys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: manifest, async: false, draft: false })
  });
  console.log(`deploy_id=${deploy.id}`);
  const required = deploy.required || [];
  console.log(`required=${required.length}`);
  for (let i = 0; i < required.length; i += 1) {
    const sha = required[i];
    const file = files.find((item) => item.sha1 === sha);
    if (!file) throw new Error(`服务器要求上传未知文件: ${sha}`);
    const response = await fetch(`${API}/deploys/${deploy.id}/files${file.rel}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Length': String(file.body.length) },
      body: file.body
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`上传失败 ${file.rel}: ${response.status} ${text}`);
    console.log(`[${i + 1}/${required.length}] ${file.rel}`);
  }
  let finalDeploy = await request(`${API}/deploys/${deploy.id}`);
  for (let i = 0; i < 60 && finalDeploy.state !== 'ready'; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    finalDeploy = await request(`${API}/deploys/${deploy.id}`);
    console.log(`state=${finalDeploy.state}`);
  }
  console.log(JSON.stringify({ site: site.ssl_url || site.url, deploy: finalDeploy.ssl_url || finalDeploy.url, state: finalDeploy.state, deploy_id: finalDeploy.id }, null, 2));
  if (finalDeploy.state !== 'ready') throw new Error(`部署未就绪: ${finalDeploy.state}`);
}

main().catch((error) => { console.error(error.stack || error); process.exit(1); });
