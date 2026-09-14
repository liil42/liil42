const fs = require('fs');
const path = 'server/src/index.js';
let t = fs.readFileSync(path, 'utf8');
const oldBlock = `const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}`;
const newBlock = `// API 未匹配的路由统一返回 404 JSON，避免被前端静态页兜底吞掉
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: '接口不存在' },
    message: '接口不存在'
  });
});

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}`;
if (!t.includes(oldBlock)) { console.error('LOCATE FAIL static block'); process.exit(1); }
t = t.replace(oldBlock, newBlock);
fs.writeFileSync(path, t, 'utf8');
console.log('SPA 兜底已修正');
