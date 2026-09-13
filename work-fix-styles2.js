const fs = require('fs');
const path = 'client/src/styles.css';
let t = fs.readFileSync(path, 'utf8');
if (!t.includes('.continue-card')) {
  t += `

.continue-card {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin: 0 0 14px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.continue-card:hover {
  border-color: var(--primary);
  box-shadow: var(--glow);
}

.continue-card span {
  display: grid;
  gap: 2px;
}

.continue-card small {
  color: var(--muted);
}

.mode-choice {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.mode-card {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
  text-align: left;
}

.mode-card span {
  color: var(--muted);
  font-size: 13px;
}

.mode-card.active {
  border-color: var(--primary);
  box-shadow: var(--glow);
}

@media (max-width: 720px) {
  .mode-choice {
    grid-template-columns: minmax(0, 1fr);
  }
}
`;
  fs.writeFileSync(path, t, 'utf8');
  console.log('continue-card / mode-card 样式已加入');
} else {
  console.log('样式已存在');
}
