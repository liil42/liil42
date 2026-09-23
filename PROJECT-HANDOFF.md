# 项目交接文档

> 用途：新会话开始时，让 Codex 先读这个文件，即可接上全部上下文，不必携带超长历史。
> 最后更新：2026-09-19 19:14

---

## 一、项目基本信息

- 项目路径：`F:\AI-codex\daimaxuexi`
- 项目名：daimaxuexi（代码理解导师）
- 技术栈：Express + SQLite（后端）/ React + Vite（前端）
- 本地端口：后端 3002，前端 5173
- 前端线上：https://liil42.github.io/liil42/
- 后端线上：https://daimaxuexi-production.up.railway.app
- 教程页：https://liil42.github.io/liil42/tutorial/api-key.html
- GitHub 仓库：https://github.com/liil42/liil42
- 最近提交：a381dfa fix: point Pages build at Railway API

## 二、当前功能状态

已完成（阶段 1-8 全部完成并线上验证）：

1. 登录稳定性：区分密码错误、后端未启动、网络错误、登录过期、未配置 API Key；token 失效自动清理。
2. 已删除 GitHub 独立入口，保留网页地址、压缩包、文件夹、报错日志入口。
3. 报错日志改为「日志必填、代码选填」，日志为空返回 ERROR_LOG_REQUIRED。
4. 网页地址分析：抓取标题、描述、标题层级、代码块、链接、正文后交给 AI 分析。
5. 网页 / 压缩包 / 报错日志分析统一写入历史记录。
6. 分析等待体验：分阶段文案、等待秒数、20 秒与 60 秒提示，失败不清空输入。
7. 设置页支持服务商选择（DeepSeek / OpenAI 兼容 / 自定义）、模型名自定义、测试连接接口。
8. 已部署到 GitHub Pages（前端）+ Railway（后端），持久化验证通过。

明确不做：微信支付、支付宝、商户号、真实收款码、支付回调、会员支付入口。

## 三、线上验收证据（2026-09-18 实测）

后端版本自检 `npm run verify:public-version`，9/9 全通过：

```
PASS | 健康检查可用 | 200
PASS | 新接口 /api/settings/test-connection 已部署 | 401
PASS | 未登录时测试连接返回 401
PASS | 注册临时账号 | 200
PASS | 新接口已部署（登录后不再 404）
PASS | 缺 API Key 时返回中文提示
PASS | 日志必填新规则已部署 | ERROR_LOG_REQUIRED
PASS | 只填日志不再提示代码为空
PASS | 注销临时账号 | 200
SUMMARY total=9 pass=9 fail=0
```

注销链路 `work-verify-public-account-delete.js`：5/5 通过（含注销后用户名可重新注册）。

持久化验证：线上注册账号 + 保存 API Key，重启 Railway 后重新登录，Key 仍存在（返回脱敏 `sk-****lder`），证明 SQLite 落在 `/data` 持久磁盘。

前端验证：首页 200（标题“代码理解导师”），主包指向 Railway，不含 localhost:3002 与 liil42.github.io/api，无支付/会员 UI。

## 四、部署信息

Railway：

- 项目 ID：5ecf42da-cff9-4b24-944b-0ef85f4c5de6
- 服务 ID：a584b04e-192c-4203-9741-dba528e0cced
- 环境 ID：8718ac09-8b4c-4a23-b92f-0d98d1cafffb
- 关键变量：LEARNING_DB_PATH=/data/learning.db、APP_DATA_FILE=/data/app.json、JWT_SECRET、ENCRYPTION_KEY、CORS_ORIGINS
- 部署命令：`railway up --detach --service daimaxuexi`（需先清空代理环境变量）
- 重启命令：`railway redeploy --service daimaxuexi --yes`

GitHub Pages：

- 工作流：.github/workflows/deploy-pages.yml
- 构建：VITE_BASE_PATH=/liil42/ GITHUB_ACTIONS=true npm run build --workspace=client
- 产物同步到 docs/ 目录发布

## 五、常用验证命令

```powershell
npm run verify:public-version   # 无密钥后端版本自检（9 项）
npm run verify:public-full      # 需 DEEPSEEK_API_KEY 的完整回归
node work-verify-public-account-delete.js
node work-verify-public-boundaries.js
```

## 六、剩余风险与未验证项

1. 真实 AI 分析结果未做端到端验证，需要用户自己的有效 API Key（设计上前置条件，非缺陷）。
2. Railway 低价套餐有冷启动，首次打开可能慢几秒。
3. 本地无任何 API Key 环境变量，服务端也不设全局 Key，用户各自在设置页填写。

## 七、注意事项（给 Codex 的提醒）

- 项目内中文文件统一 UTF-8；用 Node `fs.readFileSync(...,'utf8')` 校验，PowerShell here-string 会把中文变成问号。
- 不要提交 .env、真实 API Key、token、密码。
- 不要删除 backups/、migration/、server/data/learning.db。
- 支付相关代码不展示、不接、不启用。

---

## 八、附：Token 消费分析（2026-09-19）

今天所有调用均来自同一会话文件：
`C:\Users\Administrator\.codex\sessions\2026\09\18\rollout-2026-09-18T20-26-11-01a0b47b-...jsonl`

该会话自 2026-09-18 20:26 创建，持续到 09-19，累计上下文已达约 370 万 tokens。

今天各轮真实增量：

| 北京时间 | 输入 | 新增 tokens |
|---|---|---|
| 19:07 | 消费截图提问 | 123,433 |
| 19:08 | “我今天没用过 codex” | 123,798 |
| 19:08 | “开始查” | 510,533 |
| 19:09 | “找到了吗” | 261,921 |
| 19:11 | “找出了吗” | 265,334 |
| 19:12 | “找出了吗” | 132,925 |
| 19:12 | “找出了吗” | 267,466 |
| 19:13 | “找出了吗” | 407,683 |
| 合计 | | 约 209 万 tokens |

结论：

- 消耗来源是 Codex 工具本身（配置 `model_provider=custom`，经本机 127.0.0.1:15721 的 CC Switch 代理转发到 DeepSeek），不是 daimaxuexi 项目。
- 单句成本高的原因是每次都要重发整个超长历史上下文，会话越长越贵。
- 省钱做法：任务完成后开新会话；不要用“找到了吗”频繁催进度；长任务拆成多个会话。

---

## 九、2026-09-23 修复：AI 错误提示乱码与测试连接失效

### 问题现象

- 使用「网页地址分析」或「报错日志分析」时，页面只显示「服务暂时不可用，请稍后重试」。
- 设置页「测试连接」永远失败，用户无法判断是 Key 问题、模型名问题还是网络问题。

### 根因（两个真 Bug）

1. **中文提示源码层面就是乱码**
   `server/src/ai.js` 的 `friendlyError()` 里，返回字符串是 `AI ?????? API Key ??????` 这类问号。
   而 `server/src/errors.js` 的 `isFriendlyChineseMessage()` 要求至少 2 个中文字符，问号不满足，于是提示被丢弃，回退成默认文案「服务暂时不可用」。

2. **测试连接强制请求 JSON，必然失败**
   `requestOnce()` 无条件发送 `response_format: { type: 'json_object' }`，
   但测试连接只让模型回复「连接成功」这句普通文本，DeepSeek 会直接拒绝，导致测试连接从来无法成功。

### 修复内容

- `server/src/ai.js`：
  - `friendlyError()` 全部改为正确中文，并按错误类型分类：Key 无效、余额不足、模型名错误、超时、网络失败、限流、5xx、JSON 格式错误、400。
  - `requestOnce()` 增加 `jsonMode` 参数，默认 true；测试连接传 false，不再强制 JSON。
  - `callAI()` 同步透传 `jsonMode`。
  - 其余乱码（baseUrl 提示、extractJson 注释与报错）一并修正。
- `server/src/index.js`：
  - `/api/settings/test-connection` 改为非 JSON 模式，并在失败时返回 HTTP 400 + 真实中文原因，日志打印原始错误。
  - 全局错误处理器增加错误码回退逻辑，AI 类失败统一标记为 `AI_CONNECTION_FAILED`。

### 验证证据

本地（3102 端口）与线上均实测：

```
TEST_CONN=400
{"success":false,"error":{"code":"AI_CONNECTION_FAILED",
 "message":"你的 API Key 不能用，请到设置里重新填写或检查是否欠费"}}
```

- 乱码检查：`/?{3,}/` 在 ai.js 中已无匹配。
- 错误保留检查：9 类新中文提示全部通过 `publicErrorMessage()`，不再被回退。
- Railway 部署 ID：b3e7a5d4-f2fb-4792-99a5-e21c20ac299e，日志中文正常。

### API Key 持久化结论（回答用户疑问）

- 项目**没有** Key 自动过期逻辑；数据库表中无过期时间字段。
- Key 加密后存于 `/data/learning.db`（Railway 持久磁盘），实测重启后仍存在。
- 会话内的 `user.apiKey` 返回的是脱敏值，例如 `sk-****cdef`，因此**在页面上看不到完整 Key 属于正常现象，不代表没保存**。
- 会失效的情况：用户在 DeepSeek 后台删除 Key、Key 复制带空格、账户欠费、模型名不匹配、Railway 磁盘被重置。

### 待用户确认

用户需在设置页填入真实 Key 后点击「测试连接」，反馈页面提示原文，以区分「Key 本身问题」与「代码问题」。
