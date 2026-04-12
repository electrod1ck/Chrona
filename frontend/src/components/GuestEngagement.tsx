import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, ensureCsrf } from '../api';

type GuestEntry = { id: number; display_name: string; message: string; created_at: string };

const MOODS = [
  { id: 'calm', label: 'Тишина' },
  { id: 'warm', label: 'Тепло' },
  { id: 'light', label: 'Светло' },
  { id: 'deep', label: 'Глубоко' },
] as const;

export function GuestEngagement() {
  const [entries, setEntries] = useState<GuestEntry[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [list, st] = await Promise.all([
      apiFetch<GuestEntry[]>('/public/guest-book/'),
      apiFetch<Record<string, number>>('/public/mood-stats/'),
    ]);
    setEntries(list.slice(0, 8));
    setStats(st);
  }, []);

  useEffect(() => {
    void load().catch(() => {});
  }, [load]);

  async function onMood(mood: string) {
    setErr(null);
    try {
      await ensureCsrf();
      await apiFetch('/public/mood-pulse/', {
        method: 'POST',
        body: JSON.stringify({ mood }),
      });
      await load();
    } catch {
      setErr('Не удалось отправить. Обновите страницу и попробуйте снова.');
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (message.trim().length < 3) {
      setErr('Пару слов будет достаточно.');
      return;
    }
    try {
      await ensureCsrf();
      await apiFetch('/public/guest-book/', {
        method: 'POST',
        body: JSON.stringify({
          display_name: name.trim(),
          message: message.trim().slice(0, 600),
        }),
      });
      setMessage('');
      setName('');
      setSent(true);
      await load();
    } catch {
      setErr('Не удалось сохранить сообщение.');
    }
  }

  const totalMood = Object.values(stats).reduce((a, b) => a + b, 0) || 1;

  return (
    <section className="guest-zone card" style={{ marginBottom: 40, padding: 28 }}>
      <h2 className="editorial-section-title" style={{ marginBottom: 12 }}>
        Для гостей
      </h2>
      <p className="text-quiet" style={{ marginBottom: 24 }}>
        Всё ниже пишется в общую книгу и статистику — без аккаунта.{' '}
        <Link to="/register?fresh=1">Создать аккаунт</Link>, чтобы вести личные моменты и заметки.
      </p>

      <div style={{ marginBottom: 28 }}>
        <p className="label-caps" style={{ marginBottom: 12 }}>
          Как сейчас на душе? (сохранится в БД)
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className="primary-btn"
              style={{ opacity: 0.92 }}
              onClick={() => void onMood(m.id)}
            >
              {m.label}
              {stats[m.id] != null ? (
                <span style={{ marginLeft: 8, opacity: 0.8 }}>
                  {Math.round(((stats[m.id] || 0) / totalMood) * 100)}%
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ marginBottom: 28 }}>
        <p className="label-caps" style={{ marginBottom: 12 }}>
          Строка в гостевой книге
        </p>
        <div className="field" style={{ marginBottom: 12 }}>
          <input
            placeholder="Имя или псевдоним (необязательно)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
        </div>
        <div className="field">
          <textarea
            placeholder="Одно доброе предложение для проходящих мимо…"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={600}
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
        {err ? <p style={{ color: 'var(--warm)', fontSize: 14 }}>{err}</p> : null}
        {sent ? (
          <p className="text-quiet" style={{ marginTop: 8 }}>
            Спасибо — запись сохранена.
          </p>
        ) : null}
        <button type="submit" className="primary-btn" style={{ marginTop: 12 }}>
          Оставить в книге
        </button>
      </form>

      <div>
        <p className="label-caps" style={{ marginBottom: 12 }}>
          Недавние послания
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {entries.map((g) => (
            <li
              key={g.id}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid var(--header-border)',
                fontSize: 15,
              }}
            >
              <span className="text-quiet" style={{ display: 'block', marginBottom: 4 }}>
                {g.display_name || 'Гость'}
              </span>
              {g.message}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
