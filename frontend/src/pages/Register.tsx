import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';

export function Register() {
  const { me, register, loading, logout } = useAuth();
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && me) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await register({
        username,
        password,
        email: email.trim() || undefined,
        display_name: displayName.trim() || undefined,
      });
    } catch {
      setErr('Не удалось создать аккаунт. Проверьте имя (уникальное) и пароль (от 8 символов).');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="app-title" style={{ marginTop: 0 }}>
          Регистрация
        </h1>
        <p className="login-lead">Данные сохраняются в базе Django — только для вашего аккаунта.</p>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="reg-u">Имя пользователя</label>
            <input
              id="reg-u"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="field">
            <label htmlFor="reg-p">Пароль (от 8 символов)</label>
            <input
              id="reg-p"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="field">
            <label htmlFor="reg-e">Email (необязательно)</label>
            <input
              id="reg-e"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="reg-d">Как к вам обращаться (необязательно)</label>
            <input
              id="reg-d"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          {err ? <p style={{ color: 'var(--warm)', fontSize: 14 }}>{err}</p> : null}
          <button type="submit" className="primary-btn" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Создание…' : 'Создать аккаунт'}
          </button>
        </form>
        <p className="text-quiet" style={{ marginTop: 20 }}>
          Уже есть аккаунт? <Link to="/login">Войти</Link> ·{' '}
          <Link to="/app">Без регистрации</Link> · <Link to="/">На главную</Link>
        </p>
      </div>
    </div>
  );
}
