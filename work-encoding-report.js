const fs = require('fs');
const path = require('path');
const dirs = ['client/src', 'server/src'];
const report = [];
for (const dir of dirs) {
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(js|jsx|css|json)$/i.test(entry.name)) {
        const buf = fs.readFileSync(p);
        let replacement = 0;
        let invalid = 0;
        for (const b of buf) if (b >= 0x80) invalid += 1;
        report.push({ file: p, bytes: buf.length, highBytes: invalid, replacement });
      }
    }
  };
  walk(dir);
}
for (const item of report) console.log(`${item.highBytes}\t${item.file}`);
