const fs = require('fs');
const path = require('path');
const dirs = ['client/src', 'server/src'];
const questionable = /[\uFFFD\u00C0-\u00FF\u0100-\u02FF\u0370-\u03FF\u0400-\u052F\u2000-\u206F]/;
for (const dir of dirs) {
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(js|jsx|css)$/i.test(entry.name)) {
        const text = fs.readFileSync(p, 'utf8');
        const lines = text.split(/\r?\n/);
        lines.forEach((line, i) => {
          if (questionable.test(line) && (/\?|銆|锛|璁|鍒|鏂|鍔|閿|鐢|鐧|鏈|涓|鍚|绔|绯|缁|璇|寮|淇|鏄|鍦|浣|鐨|鍏|鍜|涓|缂|鐞|鍙|鑳|钘|闂|椤|鐐|鐜|鎴|鎵|鎬|鐩|鐭|绠|瀛|瑙|蹇|鍥|鏁|鏇|娴|瀹|璁|鐩|绗|搴|寤|鍔|鎵|鎬|鐨|鏈|鏃|瓒|鍏|鎴|鏄|浣|鏂|鍑|鍙|鐢|缁|鍚|鍒|鍔|閿|棰|鐐|璁|鍒|鐨|涓|澶|灏|鏄|鐨)/.test(line)) {
            console.log(`${p}:${i + 1}: ${line.trim().slice(0, 160)}`);
          }
        });
      }
    }
  };
  walk(dir);
}
