import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

const nav = [
  { to: '/app', end: true, label: 'Сегодня' },
  { to: '/app/moments', label: 'Моменты' },
  { to: '/app/map', label: 'Карта опыта' },
  { to: '/app/interventions', label: 'Идеи' },
  { to: '/app/rituals', label: 'Ритуалы' },
  { to: '/app/insights', label: 'Инсайты' },
  { to: '/app/notes', label: 'Заметки' },
  { to: '/app/inspiration', label: 'Вдохновение' },
  { to: '/app/profile', label: 'Профиль' },
];

export function Layout() {
  const { me, logout, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const guestHandled = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('guest') !== '1') {
      guestHandled.current = false;
      return;
    }
    if (guestHandled.current) return;
    guestHandled.current = true;
    void (async () => {
      await logout();
      navigate({ pathname: location.pathname, search: '' }, { replace: true });
    })();
  }, [location.pathname, location.search, logout, navigate]);

  return (
    <div className="shell-editorial">
      <header className="site-header">
        <div className="site-header__row">
          <Link to="/" className="brand-mark">
            Chrona
          </Link>
          <nav className="site-nav site-nav--grow" aria-label="Основная навигация">
            {nav.map(({ to, end, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  'site-nav__link' + (isActive ? ' site-nav__link--active' : '')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="site-header__auth">
            {loading ? (
              <span className="text-quiet" style={{ fontSize: 12 }}>
                …
              </span>
            ) : me ? (
              <>
                <span className="text-quiet" style={{ fontSize: 13 }}>
                  {me.display_name}
                </span>
                <button type="button" className="linkish" onClick={() => void logout()}>
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="site-header__auth-link">
                  Вход
                </Link>
                <Link to="/register" className="site-header__auth-link">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
        <p className="site-header__tagline">
          С временем как с дикой природой — с благоговением и без спешки
        </p>
      </header>

      <main className="main">
        <div className="main-inner">
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <Link to="/" className="site-footer__brand" style={{ textDecoration: 'none' }}>
          Chrona
        </Link>
        <span className="site-footer__meta">интерфейс, который замедляет внимание</span>
      </footer>
    </div>
  );
}
