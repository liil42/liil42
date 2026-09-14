const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const roots = [path.join(process.cwd(), 'client', 'src'), path.join(process.cwd(), 'server', 'src')];
const exts = new Set(['.js', '.jsx', '.css', '.json', '.html', '.md']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (exts.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function looksLikeMojibake(text) {
  const bytes = iconv.encode(text, 'gbk');
  if (bytes.length === 0) return null;
  if (bytes.includes(0x3f)) return null;
  let decoded;
  try { decoded = bytes.toString('utf8'); } catch (e) { return null; }
  if (decoded.includes('\uFFFD')) return null;
  const han = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;
  const origHan = han(text);
  const newHan = han(decoded);
  if (newHan === 0) return null;
  if (newHan < origHan) return null;
  return decoded;
}

const RARE = new Set([...'\u951b\u9418\u9352\u6d93\u4f60\u942e\u8bfe\u9427\u93b5\u93a4\u93c2\u93b8\u9562\u93ac\u9417\u93c8\u93c0\u9410\u9513\u9428\u93c6\u9420\u93c4\u93cd\u93c5']);
function score(text) {
  let n = 0;
  for (const ch of text) if (RARE.has(ch)) n += 1;
  return n;
}

const report = [];
for (const file of roots.flatMap((r) => walk(r))) {
  const original = fs.readFileSync(file, 'utf8');
  if (!/[\u4e00-\u9fff]/.test(original)) continue;
  const fixed = looksLikeMojibake(original);
  if (!fixed) continue;
  const before = score(original);
  const after = score(fixed);
  if (before <= after) continue;
  report.push({ file: path.relative(process.cwd(), file), before, after });
  fs.writeFileSync(file, fixed, 'utf8');
}
console.log(JSON.stringify(report, null, 2));