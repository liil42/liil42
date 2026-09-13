const fs = require('fs');
let t = fs.readFileSync('work-fake-ai.js', 'utf8');
t = t.replace(
  "    if (text.includes('这句代码整体') || text.includes('逐行')) {",
  "    const isLine = text.includes('这一行') || text.includes('plain_explanation') || text.includes('line_number') || text.includes('lineNumber');\n    if (isLine) {"
);
fs.writeFileSync('work-fake-ai.js', t, 'utf8');
console.log('fake-ai 匹配逻辑已修正');
