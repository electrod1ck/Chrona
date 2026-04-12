import type { ReactElement } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ExperienceMap } from './pages/ExperienceMap';
import { Inspiration } from './pages/Inspiration';
import { Insights } from './pages/Insights';
import { Interventions } from './pages/Interventions';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Moments } from './pages/Moments';
import { Notes } from './pages/Notes';
import { Profile } from './pages/Profile';
import { Register } from './pages/Register';
import { Rituals } from './pages/Rituals';

function BlockGuests({ children }: { children: ReactElement }) {
  const { me, loading } = useAuth();
  if (loading) {
    return (
      <div className="login-page">
        <p className="text-quiet">Загрузка…</p>
      </div>
    );
  }
  if (!me) {
    return (
      <div className="main-inner" style={{ padding: '48px 0' }}>
        <p className="page-header__lead">
          Этот раздел доступен после <Link to="/login">входа</Link> или{' '}
          <Link to="/register">регистрации</Link>. Или вернитесь в{' '}
          <Link to="/app">приложение как гость</Link> — там тоже есть, чем заняться.
        </p>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="moments" element={<Moments />} />
        <Route path="map" element={<ExperienceMap />} />
        <Route path="interventions" element={<Interventions />} />
        <Route path="rituals" element={<Rituals />} />
        <Route path="insights" element={<Insights />} />
        <Route path="inspiration" element={<Inspiration />} />
        <Route path="notes" element={<BlockGuests><Notes /></BlockGuests>} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
