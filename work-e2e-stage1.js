const base = "http://127.0.0.1:3002";
const out = [];
function log(name, ok, extra) { out.push((ok ? "PASS " : "FAIL ") + name + (extra ? " :: " + extra : "")); }
async function call(path, options = {}, token) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}) };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(base + path, { ...options, headers });
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  return { status: res.status, data };
}
(async () => {
  const name = "t" + Date.now().toString().slice(-8);
  const reg = await call("/api/auth/register", { method: "POST", body: JSON.stringify({ username: name, password: "test123456" }) });
  log("注册", reg.status === 200, "status=" + reg.status + " msg=" + (reg.data && reg.data.message || ""));
  const token = reg.data && reg.data.token;
  if (!token) { console.log(out.join("\n")); return; }

  const me = await call("/api/me", {}, token);
  log("获取当前用户", me.status === 200, "user=" + (me.data && me.data.user && me.data.user.username));

  const apikey = await call("/api/settings/apikey", { method: "POST", body: JSON.stringify({ provider: "deepseek", apiKey: "sk-test-not-real", baseUrl: "", model: "deepseek-chat" }) }, token);
  log("保存 API Key", apikey.status === 200, "status=" + apikey.status + " msg=" + (apikey.data && apikey.data.message || ""));

  const cats = await call("/api/learning/categories", {}, token);
  log("读取分类", cats.status === 200, "count=" + (cats.data && (cats.data.categories || []).length));

  const created = await call("/api/learning/categories", { method: "POST", body: JSON.stringify({ name: "重点项目", color: "#38bdf8" }) }, token);
  log("新建自定义分类", created.status === 200 || created.status === 201, "status=" + created.status + " msg=" + (created.data && created.data.message || ""));

  const mistakes = await call("/api/mistakes", {}, token);
  log("读取错题库", mistakes.status === 200, "count=" + (mistakes.data && (mistakes.data.mistakes || []).length));

  const history = await call("/api/learning/history", {}, token);
  log("读取历史", history.status === 200, "count=" + (history.data && (history.data.sessions || []).length));

  const bad = await call("/api/me", {}, "invalid-token");
  log("无效令牌被拒绝", bad.status === 401, "status=" + bad.status);

  await call("/api/me/account", { method: "DELETE", body: JSON.stringify({ password: "test123456" }) }, token);
  const reReg = await call("/api/auth/register", { method: "POST", body: JSON.stringify({ username: name, password: "test123456" }) });
  log("注销后用户名可重新注册", reReg.status === 200, "status=" + reReg.status + " msg=" + (reReg.data && reReg.data.message || ""));

  console.log(out.join("\n"));
})();