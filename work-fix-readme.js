const fs = require('fs');
const content = `# 代码理解导师

面向代码学习小白的网页应用：粘贴代码、上传文件、项目压缩包、GitHub 地址或网页 URL，由用户自己的 API Key 调用大模型，生成通俗的代码解析报告。

## 本地运行

\`\`\`bash
npm install
npm run setup
npm run start:all
\`\`\`

- 前端：http://localhost:5173
- 后端：http://localhost:3002
- 前端通过 Vite 代理把 \`/api\` 转发到 3002

也可以分开启动：

\`\`\`bash
npm run dev:server   # 只启动后端 3002
npm run dev:client   # 只启动前端 5173
\`\`\`

## 环境变量

项目根目录的 \`.env\`：

\`\`\`text
PORT=3002
JWT_SECRET=请替换成随机字符串
ENCRYPTION_KEY=请替换成随机字符串
ADMIN_TOKEN=请替换成随机字符串
\`\`\`

## 主要功能

- 注册 / 登录，账号注销后用户名可重新注册
- 粘贴代码、上传文件、项目压缩包、GitHub、网页、报错日志分析
- 逐行讲解、单行提问、函数提问
- 用户写“我的理解”，AI 指出理解偏差
- 学习历史，支持自定义分类
- 错题库，支持复习与简单间隔重复
- 新手模式 / 进阶模式
- 深色科技风默认，可切换浅色

## 数据库

- \`server/data/app.json\`：账号、API Key、历史、会员码
- \`server/data/learning.db\`：学习会话、逐行讲解、提问、用户理解、错题、分类、练习记录
- 预留 \`plans\` / \`orders\` / \`memberships\` 表，仅建表，不接支付流程

## 会员码

\`\`\`bash
npm run make-code -- 3
\`\`\`

生成 3 个会员码，用于在应用内激活会员。

## 支付说明

当前版本不接微信支付、支付宝支付、商户号、收款码或回调，前端不展示支付入口。数据库仅保留未来接入所需的表结构。
`;
fs.writeFileSync('README.md', content, 'utf8');
console.log('README 已更新');
