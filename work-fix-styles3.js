const fs = require('fs');
const path = 'client/src/styles.css';
let t = fs.readFileSync(path, 'utf8');
if (!t.includes('.learning-token.operator')) {
  const anchor = ".learning-token.secondary {";
  t = t.replace(anchor, `.learning-token.operator {
  color: var(--muted);
  font-weight: 500;
}

${anchor}`);
  fs.writeFileSync(path, t, 'utf8');
  console.log('operator 样式已加入');
} else {
  console.log('已存在');
}
