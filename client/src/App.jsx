import { useEffect, useState } from 'react';
import { api, getToken, setToken, clearToken } from './api';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);

  useEffect(() => {
    async function loadUser() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
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
      }
    }
    loadUser();
  }, []);

  function handleLogin(data) {
    setToken(data.token);
    setUser(data.user);
    setBackendDown(false);
  }

  function handleLogout() {
    clearToken();
    setUser(null);
  }

  if (loading) {
    return <div className="boot-screen">正在加载</div>;
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} backendDown={backendDown} />;
  }

  return <Dashboard user={user} setUser={setUser} onLogout={handleLogout} />;
}
