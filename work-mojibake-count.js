const fs = require('fs');
const path = require('path');

const roots = ['client/src', 'server/src'];
const extentions = new Set(['.js', '.jsx', '.css']);
const mojibake = /(?:锛|銆|鍒|閿|鐧|姝|鍔|璇|鏄|鐢|涓|鍚|鐨|缁|寮|瀛|椤|瀹|鏈|绔|璁|鐞|鍏|鏂|鍙|鎴|鐐|鎵|鍥|鏁|鐩|鐭|绠|搴|瓒|閫|閽|鎬|鍜|缂|鏇|鐜|閬|鍦|浣|浠|绉|鐨|鍏|绋|搴|鎵|鎬|鐩|鍒|鏂)/;
const normalCN = /[\u4e00-\u9fff]/;
const report = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (extentions.has(path.extname(entry.name))) report.push(p);
  }
}
roots.forEach(walk);
let total = 0;
for (const p of report) {
  const text = fs.readFileSync(p, 'utf8');
  const hits = text.match(new RegExp(mojibake.source, 'g')) || [];
  if (hits.length) { total += hits.length; console.log(`${hits.length}\t${p}`); }
}
console.log(`TOTAL_HITS=${total}`);
