import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, apiUpload } from '../api';
import { useAuth } from '../auth';
import { PageHeader } from '../components/PageHeader';
import { isLightModeFromDom, THEME_LIGHT_KEY } from '../theme';

type Profile = {
  display_name: string;
  avatar_url: string;
  username: string;
  email: string;
  bio: string;
  age: number | null;
};

type Stats = { comparison_line: string; avg_depth_30d: number };

export function Profile() {
  const { me, loading: authLoading, logout, refresh } = useAuth();
  const [lightMode, setLightMode] = useState(isLightModeFromDom);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState<string>('');
  const [saved, setSaved] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    setLightMode(isLightModeFromDom());
  }, [me]);

  useEffect(() => {
    if (!me) return;
    void Promise.all([
      apiFetch<Profile>('/profile/'),
      apiFetch<Stats>('/profile/stats/'),
    ]).then(([p, s]) => {
      setProfile(p);
      setStats(s);
      setDisplayName(p.display_name || '');
      setAvatarUrl(p.avatar_url || '');
      setBio(p.bio || '');
      setAge(p.age != null ? String(p.age) : '');
    });
  }, [me]);

  function toggleTheme() {
    setLightMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('theme-light');
        localStorage.setItem(THEME_LIGHT_KEY, '1');
      } else {
        document.documentElement.classList.remove('theme-light');
        localStorage.setItem(THEME_LIGHT_KEY, '0');
      }
      return next;
    });
  }

  async function exportLife() {
    const data = await apiFetch<unknown>('/export/');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chrona-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    let ageNum: number | null = null;
    if (age.trim()) {
      const n = parseInt(age, 10);
      if (n > 0 && n < 130) ageNum = n;
    }
    const updated = await apiFetch<Profile>('/profile/', {
      method: 'PATCH',
      body: JSON.stringify({
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim(),
        bio: bio.trim(),
        age: ageNum,
      }),
    });
    setProfile(updated);
    setSaved(true);
    await refresh();
  }

  async function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !me) return;
    setAvatarBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const updated = await apiUpload<Profile>('/profile/avatar/', fd);
      setProfile(updated);
      setAvatarUrl(updated.avatar_url || '');
      await refresh();
    } finally {
      setAvatarBusy(false);
    }
  }

  if (!authLoading && !me) {
    return (
      <div style={{ maxWidth: 560 }}>
        <PageHeader
          eyebrow="Вы"
          title="Профиль"
          lead="Персональные данные и экспорт доступны после входа."
        />
        <p className="page-header__lead" style={{ marginBottom: 20 }}>
          <Link to="/login">Войти</Link> или <Link to="/register">зарегистрироваться</Link>, чтобы
          менять профиль и сохранять изменения в базе.
        </p>
        <Link to="/app">← Назад в приложение</Link>
      </div>
    );
  }

  if (authLoading || !profile) {
    return <p className="text-quiet">Загрузка…</p>;
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <PageHeader
        eyebrow="Вы"
        title="Профиль"
        lead="Минимум шума — правки ниже сохраняются в БД."
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--subtle)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : null}
        </div>
        <div>
          <h2 className="profile-name" style={{ margin: 0 }}>
            {displayName || me?.display_name || 'Ты'}
          </h2>
          <div className="text-quiet" style={{ fontSize: 14 }}>
            {profile.username}
          </div>
        </div>
      </div>

      <form onSubmit={saveProfile} className="card" style={{ marginBottom: 28, padding: 24 }}>
        <h3 className="card-title" style={{ marginTop: 0 }}>
          Данные в базе
        </h3>
        <div className="field">
          <label>Имя для отображения</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} />
        </div>
        <div className="field">
          <label>Возраст (необязательно)</label>
          <input
            type="number"
            min={1}
            max={129}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Необязательно"
          />
        </div>
        <div className="field">
          <label>Аватар с устройства</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={avatarBusy}
            onChange={(ev) => void onAvatarFile(ev)}
          />
          <p className="text-quiet" style={{ marginTop: 8, fontSize: 13 }}>
            {avatarBusy ? 'Загрузка…' : 'JPEG, PNG, WebP или GIF, до нескольких мегабайт.'}
          </p>
        </div>
        <div className="field">
          <label>Или ссылка на картинку</label>
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        </div>
        <div className="field">
          <label>О себе</label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 12,
              border: '1px solid var(--subtle)',
              background: 'var(--bg)',
              color: 'var(--text)',
              font: 'inherit',
            }}
          />
        </div>
        {saved ? (
          <p className="text-quiet" style={{ marginBottom: 12 }}>
            Сохранено.
          </p>
        ) : null}
        <button type="submit" className="primary-btn">
          Сохранить профиль
        </button>
      </form>

      {stats ? (
        <p className="profile-stat-line">{stats.comparison_line}</p>
      ) : (
        <p className="text-quiet">…</p>
      )}
      <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
        <button type="button" className="primary-btn" onClick={() => void exportLife()}>
          Экспорт жизни
        </button>
        <button type="button" className="linkish" onClick={toggleTheme}>
          {lightMode ? 'Ночной вид (как титульная)' : 'Светлый режим'}
        </button>
        <button type="button" className="linkish" onClick={() => void logout()}>
          Выйти
        </button>
      </div>
    </div>
  );
}
