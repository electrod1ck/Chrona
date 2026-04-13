import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import { PageHeader } from '../components/PageHeader';

type Ritual = {
  id: number;
  title: string;
  frequency_label: string;
  days_of_week: string;
  last_completed_at: string | null;
};

const WEEK_OPTS = [
  { id: 'mon', label: 'Пн' },
  { id: 'tue', label: 'Вт' },
  { id: 'wed', label: 'Ср' },
  { id: 'thu', label: 'Чт' },
  { id: 'fri', label: 'Пт' },
  { id: 'sat', label: 'Сб' },
  { id: 'sun', label: 'Вс' },
] as const;

export function Rituals() {
  const { me, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Ritual[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newFreq, setNewFreq] = useState('каждый день');
  const [pickedDays, setPickedDays] = useState<string[]>([]);

  const load = useCallback(() => {
    void apiFetch<Ritual[]>('/rituals/').then(setRows);
  }, []);

  useEffect(() => {
    if (authLoading || !me) return;
    load();
  }, [load, me, authLoading]);

  async function mark(id: number) {
    await apiFetch(`/rituals/${id}/complete/`, { method: 'POST', body: '{}' });
    load();
  }

  async function addRitual(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await apiFetch('/rituals/', {
      method: 'POST',
      body: JSON.stringify({
        title: newTitle.trim(),
        frequency_label: newFreq.trim() || 'по настроению',
        days_of_week: pickedDays.length ? pickedDays.join(',') : '',
      }),
    });
    setNewTitle('');
    setNewFreq('каждый день');
    setPickedDays([]);
    load();
  }

  if (!authLoading && !me) {
    return (
      <div>
        <PageHeader
          eyebrow="Ритм"
          title="Ритуалы"
          lead="Личные ритуалы хранятся в вашем аккаунте."
        />
        <p className="page-header__lead" style={{ marginBottom: 20 }}>
          Войдите, чтобы создавать ритуалы и отмечать их — данные уходят в базу. На главной
          приложения гости могут поучаствовать в общих активностях.
        </p>
        <Link to="/login" className="primary-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
          Вход
        </Link>{' '}
        <Link to="/register" className="linkish" style={{ marginLeft: 12 }}>
          Регистрация
        </Link>
      </div>
    );
  }

  if (authLoading) return <p className="text-quiet">Загрузка…</p>;

  return (
    <div>
      <PageHeader
        eyebrow="Ритм"
        title="Ритуалы"
        lead="Назовите ритуал, выберите частоту и дни недели — спокойное планирование без давления."
      />

      <form onSubmit={addRitual} className="card" style={{ marginBottom: 28, padding: 22 }}>
        <h3 className="card-title" style={{ marginTop: 0 }}>
          Новый ритуал
        </h3>
        <div className="field">
          <label>Название</label>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required maxLength={120} />
        </div>
        <div className="field">
          <label>Как часто</label>
          <input value={newFreq} onChange={(e) => setNewFreq(e.target.value)} maxLength={64} />
        </div>
        <div className="field">
          <span className="label-caps" style={{ display: 'block', marginBottom: 10 }}>
            Дни недели
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {WEEK_OPTS.map((d) => (
              <label
                key={d.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={pickedDays.includes(d.id)}
                  onChange={() => {
                    setPickedDays((prev) =>
                      prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                    );
                  }}
                />
                {d.label}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="primary-btn">
          Сохранить в БД
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {rows.map((r) => (
          <div
            key={r.id}
            className="card hover-lift"
            style={{
              padding: 24,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <div>
              <h2 className="card-title" style={{ marginBottom: 6 }}>
                {r.title}
              </h2>
              <div className="label-caps">
                {r.frequency_label}
                {r.days_of_week
                  ? ` · ${r.days_of_week.split(',').map((x) => WEEK_OPTS.find((w) => w.id === x)?.label || x).join(', ')}`
                  : ''}
              </div>
              <div className="text-quiet" style={{ marginTop: 8, fontSize: 14 }}>
                Последний раз:{' '}
                {r.last_completed_at
                  ? new Date(r.last_completed_at).toLocaleString('ru-RU')
                  : 'ещё не отмечали'}
              </div>
            </div>
            <button
              type="button"
              className="primary-btn"
              onClick={() => mark(r.id)}
              style={{
                boxShadow: '0 0 0 0 rgba(107,155,126,0)',
                transition: 'box-shadow 0.4s ease, transform 120ms',
              }}
              onMouseDown={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 0 24px rgba(107, 155, 126, 0.45)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 0 0 0 rgba(107,155,126,0)';
              }}
            >
              Отметить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
