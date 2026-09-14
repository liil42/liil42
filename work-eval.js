const base = "http://127.0.0.1:3002";
const out = [];
function log(n, ok, x) { out.push((ok ? "PASS " : "FAIL ") + n + (x ? " :: " + x : "")); }
async function call(path, options = {}, token) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}) };
  if (token) headers.Authorization = "Bearer " + token;
  let res, text;
  try { res = await fetch(base + path, { ...options, headers }); text = await res.text(); }
  catch (e) { return { status: -1, raw: String(e.message) }; }
  let data = null; try { data = JSON.parse(text); } catch (e) { data = { raw: text.slice(0, 200) }; }
  return { status: res.status, data };
}
(async () => {
  const name = "t" + Date.now().toString().slice(-8);
  const reg = await call("/api/auth/register", { method: "POST", body: JSON.stringify({ username: name, password: "test123456" }) });
  log("注册", reg.status === 200);
  const token = reg.data && reg.data.token;
  if (!token) { console.log(out.join("\n")); return; }

  const noKey = await call("/api/analyze/snippet", { method: "POST", body: JSON.stringify({ code: "const a=1;", language: "js" }) }, token);
  log("未配置APIKey时分析被拦截", noKey.status === 400, "status=" + noKey.status + " msg=" + (noKey.data && noKey.data.message));

  const emptyCode = await call("/api/analyze/snippet", { method: "POST", body: JSON.stringify({ code: "", language: "js" }) }, token);
  log("空代码被拒绝", emptyCode.status === 400, "status=" + emptyCode.status);

  const near200k = "a".repeat(200001);
  const tooLong = await call("/api/analyze/snippet", { method: "POST", body: JSON.stringify({ code: near200k, language: "js" }) }, token);
  log("超长代码被拒绝", tooLong.status === 400, "status=" + tooLong.status + " msg=" + (tooLong.data && tooLong.data.message));

  const badPwd = await call("/api/auth/login", { method: "POST", body: JSON.stringify({ username: name, password: "wrongpass" }) });
  log("错误密码被拒绝", badPwd.status === 401);

  const dupReg = await call("/api/auth/register", { method: "POST", body: JSON.stringify({ username: name, password: "test123456" }) });
  log("重复用户名被拒绝", dupReg.status === 409);

  const shortPwd = await call("/api/auth/register", { method: "POST", body: JSON.stringify({ username: name + "x", password: "1" }) });
  log("短密码被拒绝", shortPwd.status === 400);

  const badToken = await call("/api/me", {}, "abc.def.ghi");
  log("伪造令牌被拒绝", badToken.status === 401);

  const beforeLogin = await call("/api/learning/sessions", {});
  log("未登录访问学习数据被拒绝", beforeLogin.status === 401);

  const sess = await call("/api/learning/sessions/nonexistent-id", {}, token);
  log("不存在的学习记录返回404", sess.status === 404, "status=" + sess.status);

  const badMistake = await call("/api/mistakes", { method: "POST", body: JSON.stringify({ sessionId: "nope", itemType: "line", startLine: 1, endLine: 1, title: "t", codeSnippet: "c", question: "q" }) }, token);
  log("给不存在的会话加错题被拒绝", badMistake.status >= 400, "status=" + badMistake.status + " msg=" + (badMistake.data && badMistake.data.message));

  const badCategory = await call("/api/learning/sessions/nope/category", { method: "PUT", body: JSON.stringify({ categoryId: null }) }, token);
  log("给不存在的会话改分类被拒绝", badCategory.status === 404, "status=" + badCategory.status);

  const deleteWrongPwd = await call("/api/me/account", { method: "DELETE", body: JSON.stringify({ password: "wrong" }) }, token);
  log("注销时密码错误被拒绝", deleteWrongPwd.status === 401);

  console.log(out.join("\n"));
})();