const fs = require('fs');
const path = 'server/src/index.js';
let t = fs.readFileSync(path, 'utf8');
if (!t.includes('chcp 65001')) {
  const header = `// Windows 控制台默认 GBK，会导致中文日志乱码；这里统一切到 UTF-8 输出
if (process.platform === 'win32' && process.stdout && process.stdout.isTTY) {
  try {
    require('child_process').execSync('chcp 65001', { stdio: 'ignore' });
  } catch (error) {
    // 切换失败时忽略，不影响服务启动
  }
}

`;
  t = header + t;
  fs.writeFileSync(path, t, 'utf8');
  console.log('日志编码设置已加入');
} else {
  console.log('已存在日志编码设置');
}
