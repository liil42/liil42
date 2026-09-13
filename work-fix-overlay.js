const fs = require('fs');
const path = 'client/src/styles.css';
let t = fs.readFileSync(path, 'utf8');
t = t.replace(
`.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow: auto;`,
`.modal-overlay {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow: auto;`
);
fs.writeFileSync(path, t, 'utf8');
console.log('遮罩覆盖修正完成');
