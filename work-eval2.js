const base = "http://127.0.0.1:3002";
const out = [];
function log(n, ok, x) { out.push((ok ? "PASS " : "FAIL ") + n + (x ? " :: " + x : "")); }
async function call(path, options = {}, token) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}) };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(base + path, { ...options, headers });
  let data = null; try { data = await res.json(); } catch (e) { data = null; }
  return { status: res.status, data };
}
(async () => {
  const name = "u" + Date.now().toString().slice(-8);
  const reg = await call("/api/auth/register", { method: "POST", body: JSON.stringify({ username: name, password: "test123456" }) });
  const token = reg.data.token;

  await call("/api/settings/apikey", { method: "POST", body: JSON.stringify({ provider: "deepseek", apiKey: "sk-fake", baseUrl: "", model: "deepseek-chat" }) }, token);

  const cat = await call("/api/learning/categories", { method: "POST", body: JSON.stringify({ name: "重点工作", color: "#38bdf8" }) }, token);
  log("新建自定义分类", cat.status === 201 || cat.status === 200, "status=" + cat.status);

  const cats = await call("/api/learning/categories", {}, token);
  const catId = cats.data.categories[0].id;

  const rename = await call("/api/learning/categories/" + catId, { method: "PUT", body: JSON.stringify({ name: "重点项目" }) }, token);
  log("分类改名", rename.status === 200, "status=" + rename.status);

  const mistakes = await call("/api/mistakes", {}, token);
  log("错题库接口", mistakes.status === 200);

  const practice = await call("/api/learning/sessions/none/practice", { method: "POST", body: JSON.stringify({ lineNumber: 1, practiceType: "explain", answer: "test" }) }, token);
  out.push("INFO 练习接口对不存在会话返回 status=" + practice.status + " msg=" + (practice.data && practice.data.message));

  const reviewRoute = await call("/api/mistakes/none/review", { method: "POST" }, token);
  out.push("INFO 复习接口对不存在错题返回 status=" + reviewRoute.status);

  console.log(out.join("\n"));
})();