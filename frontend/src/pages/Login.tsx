import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';

export function Login() {
  const { me, login, loading, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const freshDone = useRef(false);

  useEffect(() => {
    if (searchParams.get('fresh') !== '1') {
      freshDone.current = false;
      return;
    }
    if (freshDone.current) return;
    freshDone.current = true;
    void (async () => {
      await logout();
      setSearchParams({}, { replace: true });
    })();
  }, [logout, searchParams, setSearchParams]);
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('demo');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && me) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(username, password);
    } catch {
      setErr('Не удалось войти. Проверь логин и пароль.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="app-title" style={{ fontSize: 28, marginTop: 0 }}>
          Chrona
        </h1>
        <p className="login-lead">Здесь не нужно спешить. Войди, когда будешь готов.</p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="u">Имя</label>
            <input
              id="u"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="p">Пароль</label>
            <input
              id="p"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err ? (
            <p style={{ color: 'var(--warm)', fontSize: 14 }}>{err}</p>
          ) : null}
          <button type="submit" className="primary-btn" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Вход…' : 'Войти'}
          </button>
        </form>
        <p className="text-quiet" style={{ marginTop: 20, fontSize: 13 }}>
          После <code>seed_chrona</code>: логин <strong>demo</strong>, пароль{' '}
          <strong>demo</strong>
        </p>
        <p className="text-quiet" style={{ marginTop: 12, fontSize: 13 }}>
          <Link to="/register">Регистрация</Link> · <Link to="/app">Без входа</Link> ·{' '}
          <Link to="/">Титульная</Link>
        </p>
      </div>
    </div>
  );
}
