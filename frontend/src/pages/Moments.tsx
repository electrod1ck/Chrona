import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import { PageHeader } from '../components/PageHeader';

type Tag = { id: number; name: string };
type Moment = {
  id: number;
  text: string;
  emotion: string;
  image_url: string;
  tags: Tag[];
  created_at: string;
};

const emotions = [
  { id: 'calm', label: 'спокойствие' },
  { id: 'warm', label: 'тепло' },
  { id: 'growth', label: 'рост' },
  { id: 'deep', label: 'глубина' },
] as const;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Moments() {
  const { me, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Moment[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [step, setStep] = useState(0);
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState<string>('calm');
  const [imageUrl, setImageUrl] = useState('');
  const [tagInput, setTagInput] = useState('');

  const [editText, setEditText] = useState('');
  const [editEmotion, setEditEmotion] = useState('calm');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editTagInput, setEditTagInput] = useState('');

  const load = useCallback(async () => {
    const [m, t] = await Promise.all([
      apiFetch<Moment[]>('/moments/'),
      apiFetch<Tag[]>('/tags/'),
    ]);
    setItems(m);
    setTags(t);
  }, []);

  useEffect(() => {
    if (authLoading || !me) return;
    void load().catch(() => {});
  }, [load, me, authLoading]);

  const selected = items.find((m) => m.id === openId) || null;

  async function ensureTags(names: string[]): Promise<number[]> {
    const ids: number[] = [];
    const byName = new Map(tags.map((x) => [x.name.toLowerCase(), x.id]));
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      let id = byName.get(key);
      if (id == null) {
        const created = await apiFetch<Tag>('/tags/', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
        id = created.id;
        byName.set(key, id);
        setTags((prev) => [...prev, created]);
      }
      ids.push(id);
    }
    return ids;
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    const tagNames = tagInput.split(',').map((s) => s.trim()).filter(Boolean);
    const tag_ids = await ensureTags(tagNames);
    await apiFetch('/moments/', {
      method: 'POST',
      body: JSON.stringify({
        text,
        emotion,
        image_url: imageUrl,
        tag_ids,
      }),
    });
    setOpenCreate(false);
    setStep(0);
    setText('');
    setEmotion('calm');
    setImageUrl('');
    setTagInput('');
    await load();
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const tagNames = editTagInput.split(',').map((s) => s.trim()).filter(Boolean);
    const tag_ids = await ensureTags(tagNames);
    await apiFetch(`/moments/${selected.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        text: editText,
        emotion: editEmotion,
        image_url: editImageUrl,
        tag_ids,
      }),
    });
    setIsEditing(false);
    setOpenId(null);
    await load();
  }

  async function deleteSelected() {
    if (!selected || !confirm('Удалить этот момент? Запись в БД будет стёрта.')) return;
    await apiFetch(`/moments/${selected.id}/`, { method: 'DELETE' });
    setOpenId(null);
    setIsEditing(false);
    await load();
  }

  function openDetail(m: Moment) {
    setOpenId(m.id);
    setIsEditing(false);
  }

  if (!authLoading && !me) {
    return (
      <div>
        <PageHeader
          eyebrow="Дневник"
          title="Моменты"
          lead="Личные моменты сохраняются в вашем аккаунте."
        />
        <p className="page-header__lead" style={{ marginBottom: 20 }}>
          Войдите или зарегистрируйтесь, чтобы создавать моменты — они пишутся в базу данных и
          остаются только у вас. Как гость вы можете оставить послание в общей книге на главной
          приложения.
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

  if (authLoading) {
    return <p className="text-quiet">Загрузка…</p>;
  }

  return (
    <div>
      <PageHeader
        eyebrow="Дневник"
        title="Моменты"
        lead="Короткие записи о том, что происходит — без спешки и без отчёта."
      />
      <button
        type="button"
        className="editorial-cta"
        onClick={() => {
          setOpenCreate(true);
          setStep(0);
        }}
      >
        + Новый момент
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            className="card hover-lift"
            onClick={() => openDetail(m)}
            style={{
              width: '100%',
              textAlign: 'left',
              border: 'none',
              cursor: 'pointer',
              display: 'grid',
              gridTemplateColumns: '56px 1fr auto',
              gap: 16,
              alignItems: 'center',
              padding: 18,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: 'var(--subtle)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {m.image_url ? (
                <img
                  src={m.image_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
            </div>
            <div>
              <div className="label-caps" style={{ letterSpacing: '0.14em' }}>
                {formatTime(m.created_at)}
              </div>
              <div style={{ fontSize: 16 }}>{m.text}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <div>
                {m.tags.slice(0, 3).map((t) => (
                  <span key={t.id} className="tag-pill">
                    {t.name}
                  </span>
                ))}
              </div>
              <span className={`emotion-dot emotion-${m.emotion}`} />
            </div>
          </button>
        ))}
      </div>

      {openCreate ? (
        <div className="overlay-backdrop" role="dialog" aria-modal onClick={() => setOpenCreate(false)}>
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <h2 className="app-title" style={{ marginTop: 0 }}>Новый момент</h2>
            <p className="text-quiet" style={{ marginBottom: 20 }}>
              Что сейчас происходит?
            </p>
            <form onSubmit={submitCreate}>
              {step >= 0 ? (
                <div className="field">
                  <label>Текст</label>
                  <textarea
                    rows={4}
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      if (e.target.value.length > 2) setStep((s) => Math.max(s, 1));
                    }}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 12,
                      border: '1px solid var(--subtle)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      font: 'inherit',
                    }}
                  />
                </div>
              ) : null}
              {step >= 1 ? (
                <div className="field">
                  <label>Эмоция</label>
                  <select
                    value={emotion}
                    onChange={(e) => {
                      setEmotion(e.target.value);
                      setStep((s) => Math.max(s, 2));
                    }}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 12,
                      border: '1px solid var(--subtle)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      font: 'inherit',
                    }}
                  >
                    {emotions.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {step >= 2 ? (
                <div className="field">
                  <label>Фото (ссылка)</label>
                  <input
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setStep((s) => Math.max(s, 3));
                    }}
                  />
                </div>
              ) : null}
              {step >= 3 ? (
                <div className="field">
                  <label>Теги через запятую</label>
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="прогулка, разговор"
                  />
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" className="primary-btn">
                  Сохранить момент
                </button>
                <button type="button" className="linkish" onClick={() => setOpenCreate(false)}>
                  Закрыть
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div
          className="overlay-backdrop"
          role="dialog"
          aria-modal
          onClick={() => {
            setOpenId(null);
            setIsEditing(false);
          }}
        >
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            {!isEditing ? (
              <>
                <div className="label-caps" style={{ letterSpacing: '0.14em' }}>
                  {formatTime(selected.created_at)}
                </div>
                <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--text)' }}>{selected.text}</p>
                {selected.image_url ? (
                  <img
                    src={selected.image_url}
                    alt=""
                    style={{ width: '100%', borderRadius: 12, marginTop: 12 }}
                  />
                ) : null}
                <div style={{ marginTop: 16 }}>
                  {selected.tags.map((t) => (
                    <span key={t.id} className="tag-pill">
                      {t.name}
                    </span>
                  ))}
                  <span
                    className={`emotion-dot emotion-${selected.emotion}`}
                    style={{ marginLeft: 8, verticalAlign: 'middle' }}
                  />
                </div>
                <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      setEditText(selected.text);
                      setEditEmotion(selected.emotion);
                      setEditImageUrl(selected.image_url || '');
                      setEditTagInput(selected.tags.map((t) => t.name).join(', '));
                      setIsEditing(true);
                    }}
                  >
                    Изменить в БД
                  </button>
                  <button type="button" className="linkish" onClick={() => void deleteSelected()}>
                    Удалить
                  </button>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => {
                      setOpenId(null);
                      setIsEditing(false);
                    }}
                  >
                    Закрыть
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={saveEdit}>
                <h3 className="card-title" style={{ marginTop: 0 }}>
                  Редактирование
                </h3>
                <div className="field">
                  <label>Текст</label>
                  <textarea
                    required
                    rows={4}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 12,
                      border: '1px solid var(--subtle)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      font: 'inherit',
                    }}
                  />
                </div>
                <div className="field">
                  <label>Эмоция</label>
                  <select
                    value={editEmotion}
                    onChange={(e) => setEditEmotion(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 12,
                      border: '1px solid var(--subtle)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      font: 'inherit',
                    }}
                  >
                    {emotions.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Фото (ссылка)</label>
                  <input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} />
                </div>
                <div className="field">
                  <label>Теги через запятую</label>
                  <input value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)} />
                </div>
                <button type="submit" className="primary-btn">
                  Сохранить изменения
                </button>
                <button
                  type="button"
                  className="linkish"
                  style={{ marginLeft: 12 }}
                  onClick={() => setIsEditing(false)}
                >
                  Отмена
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
