import { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { isAuthenticated, setToken } from './api-client';
import StatusPage from './pages/StatusPage';
import GroupsPage from './pages/GroupsPage';
import MessagesPage from './pages/MessagesPage';
import TasksPage from './pages/TasksPage';
import LogsPage from './pages/LogsPage';
import SearchPage from './pages/SearchPage';
import CostsPage from './pages/CostsPage';

function Login() {
  const [secret, setSecret] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secret.trim()) {
      setToken(secret.trim());
      window.location.reload();
    }
  };

  return (
    <div className="login">
      <div className="login-box">
        <h1>NanoClaw</h1>
        <p>Enter your dashboard secret to continue.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Dashboard secret"
            autoFocus
          />
          <button type="submit">Continue</button>
        </form>
      </div>
    </div>
  );
}

function Layout() {
  return (
    <div className="layout">
      <header className="topbar">
        <span className="topbar-logo">NanoClaw</span>
        <nav className="topbar-nav">
          <NavLink to="/" end>Status</NavLink>
          <NavLink to="/groups">Groups</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/costs">Costs</NavLink>
          <NavLink to="/logs">Logs</NavLink>
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<StatusPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/:jid" element={<MessagesPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/costs" element={<CostsPage />} />
          <Route path="/logs" element={<LogsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  if (!isAuthenticated()) return <Login />;
  return <Layout />;
}
