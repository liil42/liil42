const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join('client','dist','index.html'), 'utf8');
const assets = [];
for (const re of [/href="([^"]+)"/g, /src="([^"]+)"/g]) {
  for (const match of html.matchAll(re)) assets.push(match[1]);
}
const relevant = assets.filter((item) => item.includes('/assets/'));
console.log(JSON.stringify({ assets: relevant }, null, 2));
if (relevant.length === 0) throw new Error('没有发现构建资源');
if (!relevant.every((item) => item.startsWith('/liil42/'))) throw new Error('资源路径未带 /liil42/ 前缀');
console.log('PAGES_BUILD_PATHS_OK');
