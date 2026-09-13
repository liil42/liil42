const fs = require("fs");
const p = "F:/AI-codex/daimaxuexi/client/src/App.jsx";
let t = fs.readFileSync(p, "utf8");
const before = t;

// 1. 记录上一次后端不可达的状态，避免登录页静默丢失原因
t = t.replace(
`import { useEffect, useState } from 'react';
import { api, getToken, setToken, clearToken } from './api';`,
`import { useEffect, useState } from 'react';
import { api, getToken, setToken, clearToken } from './api';`
);

// 2. 登录态校验失败时区分「后端未启动」和「登录过期」
t = t.replace(
`      try {
        const data = await api('/api/me');
        setUser(data.user);
      } catch (error) {
        clearToken();
      } finally {
        setLoading(false);
      }`,
`      try {
        const data = await api('/api/me');
        setUser(data.user);
      } catch (error) {
        if (error && error.status === 0) {
          setBackendDown(true);
        } else {
          clearToken();
        }
      } finally {
        setLoading(false);
      }`
);

t = t.replace(
`export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);`,
`export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);`
);

t = t.replace(
`  function handleLogin(data) {
    setToken(data.token);
    setUser(data.user);
  }`,
`  function handleLogin(data) {
    setToken(data.token);
    setUser(data.user);
    setBackendDown(false);
  }`
);

t = t.replace(
`  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }`,
`  if (!user) {
    return <LoginPage onLogin={handleLogin} backendDown={backendDown} />;
  }`
);

if (t === before) {
  console.error("NO_CHANGE");
  process.exit(1);
}
fs.writeFileSync(p, t);
console.log("APP_UPDATED");