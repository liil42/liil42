# 代码理解导师

面向代码学习小白的网页应用：粘贴代码、上传文件、项目压缩包、GitHub 地址或网页 URL，由用户自己的 API Key 调用大模型，生成通俗的代码解析报告。

## 本地运行

```bash
npm install
npm run setup
npm run start:all
```

- 前端：http://localhost:5173
- 后端：http://localhost:3002
- 前端通过 Vite 代理把 `/api` 转发到 3002

也可以分开启动：

```bash
npm run dev:server   # 只启动后端 3002
npm run dev:client   # 只启动前端 5173
```

## 环境变量

项目根目录的 `.env`：

```text
PORT=3002
JWT_SECRET=请替换成随机字符串
ENCRYPTION_KEY=请替换成随机字符串
ADMIN_TOKEN=请替换成随机字符串
```

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

- `server/data/learning.db`：当前主数据库，保存账号、加密后的 API Key、分析记录、学习会话、逐行讲解、提问、用户理解、错题、分类和练习记录
- `server/data/app.json`：旧版数据文件，仅在数据库为空时用于一次性导入账号、API Key 和分析记录
- 预留 `plans` / `orders` / `memberships` 表，仅建表，不接支付流程

## 支付说明

当前版本不接微信支付、支付宝支付、商户号、收款码或回调，前端不展示支付入口，也不启用会员激活流程。数据库仅保留未来接入所需的表结构。

## 公网部署

当前正式环境：

- 前端：https://liil42.github.io/liil42/
- 后端：https://daimaxuexi-production.up.railway.app
- 后端健康检查：https://daimaxuexi-production.up.railway.app/api/health
- 后端平台：Railway
- 持久卷挂载路径：`/data`
- 学习数据库：`/data/learning.db`

### Railway 后端

Railway 使用仓库根目录的 `Dockerfile` 构建和启动：

```text
PORT=自动注入
NODE_ENV=production
APP_DATA_FILE=/data/app.json
LEARNING_DB_PATH=/data/learning.db
CORS_ORIGINS=https://liil42.github.io,http://localhost:5173,http://127.0.0.1:5173
JWT_SECRET=生产环境随机长字符串
ENCRYPTION_KEY=生产环境随机长字符串
```

`/data` 必须挂载持久卷，否则容器重启后 SQLite 数据会丢失。

### GitHub Pages 前端

前端发布目录是 `docs/`，由 GitHub Pages 的 `main /docs` 提供。生产构建命令：

```powershell
$env:VITE_BASE_PATH='/liil42/'
$env:VITE_API_BASE_URL='https://daimaxuexi-production.up.railway.app'
npm run build --workspace=client
```

构建后把 `client/dist` 同步到 `docs/`，并保留 `docs/404.html` 和 `docs/.nojekyll`。

### 公网验收

配置自己的 DeepSeek Key 后，可以运行完整公网学习闭环验证：

```powershell
$env:DEEPSEEK_API_KEY='你的 DeepSeek API Key'
node work-verify-public-full.js
```

脚本只在内存中读取 Key，不会把 Key 写入仓库；测试完成后会自动清理临时账号和测试数据。

### 常见问题

- 登录后请求失败：先访问后端 `/api/health`，确认 Railway 服务可访问。
- AI 分析失败：确认设置页已经填写有效 DeepSeek Key，并检查余额。
- Pages 资源 404：确认构建使用了 `VITE_BASE_PATH=/liil42/`。
- 刷新深层路径 404：当前是单页状态切换，入口从 `https://liil42.github.io/liil42/` 打开。
- 数据丢失：确认 Railway 持久卷仍挂载在 `/data`，且 `LEARNING_DB_PATH=/data/learning.db`。

不要提交 `.env`、AI API Key、`JWT_SECRET` 或 `ENCRYPTION_KEY` 到仓库。