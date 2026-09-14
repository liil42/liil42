const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|jsx|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = [...walk('client/src'), ...walk('server/src')];
for (const p of files) {
  const buf = fs.readFileSync(p);
  const text = buf.toString('utf8');
  const counts = new Map();
  for (const ch of text) {
    if (/[\u4e00-\u9fff]/.test(ch)) counts.set(ch, (counts.get(ch) || 0) + 1);
  }
  const list = [...counts.entries()].sort((a,b) => b[1]-a[1]).slice(0, 12);
  console.log(p + ' | ' + list.map(([k,v]) => `${k}:${v}`).join(' '));
}
