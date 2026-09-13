const fs = require('fs');
const path = 'client/src/styles.css';
let t = fs.readFileSync(path, 'utf8');
const before = t.length;

// 1) 弹窗遮罩改为 grid 严格居中
t = t.replace(
`.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: auto;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(4px);
}`,
`.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow: auto;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(4px);
}`
);

// 2) 学习弹窗尺寸约束
t = t.replace(
`.learning-modal {
  width: min(1180px, calc(100vw - 48px));
  max-width: calc(100vw - 48px);
}`,
`.learning-modal {
  width: min(1180px, 96vw);
  max-width: 96vw;
  max-height: 90vh;
  margin: 0;
  overflow: hidden;
  display: grid;
}`
);

// 3) 移动端媒体查询：不再顶到上方
t = t.replace(
`  .modal-overlay {
    padding: 12px;
    align-items: flex-start;
  }`,
`  .modal-overlay {
    padding: 12px;
    place-items: center;
    align-items: center;
  }`
);
t = t.replace(
`  .learning-modal {
    width: calc(100vw - 32px);
    max-width: calc(100vw - 32px);
  }`,
`  .learning-modal {
    width: calc(100vw - 32px);
    max-width: calc(100vw - 32px);
    max-height: 88vh;
  }`
);
t = t.replace(
`  .learning-modal {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
  }`,
`  .learning-modal {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
    max-height: 92vh;
  }`
);
t = t.replace(
`  .learning-modal {
    width: 100%;
    max-width: 100%;
  }`,
`  .learning-modal {
    width: 100%;
    max-width: 100%;
    max-height: 92vh;
  }`
);

fs.writeFileSync(path, t, 'utf8');
console.log('styles.css updated', before, '->', t.length);
