const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..', '..');
const envPath = path.join(root, '.env');

if (!fs.existsSync(envPath)) {
  const env = [
    'PORT=3001',
    `JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`,
    `ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`,
    `ADMIN_TOKEN=${crypto.randomBytes(16).toString('hex')}`
  ].join('\n') + '\n';
  fs.writeFileSync(envPath, env);
  console.log('已生成 .env 文件');
} else {
  console.log('.env 文件已存在，跳过生成');
}
