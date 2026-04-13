import type { CSSProperties } from 'react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch, apiUpload } from '../api';
import { useAuth } from '../auth';
import { PageHeader } from '../components/PageHeader';

type Tag = { id: number; name: string };
type PlaceT = { id: number; name: string };
type Moment = {
  id: number;
  text: string;
  note?: string;
  emotion: string;
  image_url: string;
  tags: Tag[];
  places?: PlaceT[];
  location?: string;
  integration_ref?: string;
  created_at: string;
};

const emotions = [
  { id: 'calm', label: 'Спокойствие' },
  { id: 'warm', label: 'Тепло' },
  { id: 'growth', label: 'Рост' },
  { id: 'deep', label: 'Глубина' },
  { id: 'joy', label: 'Радость' },
  { id: 'gratitude', label: 'Благодарность' },
  { id: 'tired', label: 'Усталость' },
  { id: 'anxious', label: 'Тревога' },
  { id: 'hope', label: 'Надежда' },
  { id: 'tender', label: 'Нежность' },
  { id: 'focus', label: 'Собранность' },
  { id: 'light', label: 'Лёгкость' },
] as const;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function chipStyle(on: boolean): CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: 999,
    border: on ? '1px solid var(--primary-soft)' : '1px solid var(--subtle)',
    background: on ? 'rgba(157, 196, 174, 0.18)' : 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: 14,
  };
}

export function Moments() {
  const { me, loading: authLoading } = useAuth();
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState<Moment[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [places, setPlaces] = useState<PlaceT[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState<string>('calm');
  const [imageUrl, setImageUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [tagComma, setTagComma] = useState('');
  const [placeComma, setPlaceComma] = useState('');
  const [selTagIds, setSelTagIds] = useState<number[]>([]);
  const [selPlaceIds, setSelPlaceIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newPlaceName, setNewPlaceName] = useState('');
  const [location, setLocation] = useState('');
  const [integrationRef, setIntegrationRef] = useState('');

  const [editText, setEditText] = useState('');
  const [editEmotion, setEditEmotion] = useState('calm');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editTagComma, setEditTagComma] = useState('');
  const [editPlaceComma, setEditPlaceComma] = useState('');
  const [editSelTagIds, setEditSelTagIds] = useState<number[]>([]);
  const [editSelPlaceIds, setEditSelPlaceIds] = useState<number[]>([]);
  const [editNewTagName, setEditNewTagName] = useState('');
  const [editNewPlaceName, setEditNewPlaceName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editIntegrationRef, setEditIntegrationRef] = useState('');

  const load = useCallback(async () => {
    const [m, t, p] = await Promise.all([
      apiFetch<Moment[]>('/moments/'),
      apiFetch<Tag[]>('/tags/'),
      apiFetch<PlaceT[]>('/places/'),
    ]);
    setItems(m);
    setTags(t);
    setPlaces(p);
  }, []);

  useEffect(() => {
    if (authLoading || !me) return;
    void load().catch(() => {});
  }, [load, me, authLoading]);

  useEffect(() => {
    if (authLoading || !me) return;
    const navState = (routeLocation.state ?? {}) as {
      prefillFromAdapted?: string;
      integrationRef?: string;
      promptCreateMoment?: boolean;
    };
    if (!navState.promptCreateMoment) return;
    resetCreateForm();
    setOpenId(null);
    setIsEditing(false);
    if (navState.prefillFromAdapted) {
      setText(`Выполнил(а) микроинтервенцию: ${navState.prefillFromAdapted}`);
    }
    if (navState.integrationRef) {
      setIntegrationRef(navState.integrationRef);
    }
    setOpenCreate(true);
    void navigate(routeLocation.pathname, { replace: true, state: null });
  }, [authLoading, me, routeLocation.pathname, routeLocation.state, navigate]);

  const selected = items.find((m) => m.id === openId) || null;

  function toggleId(list: number[], id: number): number[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

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

  async function ensurePlaces(names: string[]): Promise<number[]> {
    const ids: number[] = [];
    const byName = new Map(places.map((x) => [x.name.toLowerCase(), x.id]));
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      let id = byName.get(key);
      if (id == null) {
        const created = await apiFetch<PlaceT>('/places/', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
        id = created.id;
        byName.set(key, id);
        setPlaces((prev) => [...prev, created]);
      }
      ids.push(id);
    }
    return ids;
  }

  async function addTagByName(name: string, which: 'create' | 'edit') {
    const n = name.trim();
    if (!n) return;
    const ids = await ensureTags([n]);
    const id = ids[0];
    if (which === 'create') setSelTagIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    else setEditSelTagIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (which === 'create') setNewTagName('');
    else setEditNewTagName('');
  }

  async function addPlaceByName(name: string, which: 'create' | 'edit') {
    const n = name.trim();
    if (!n) return;
    const ids = await ensurePlaces([n]);
    const id = ids[0];
    if (which === 'create') setSelPlaceIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    else setEditSelPlaceIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (which === 'create') setNewPlaceName('');
    else setEditNewPlaceName('');
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    const fromCommaTags = await ensureTags(tagComma.split(',').map((s) => s.trim()).filter(Boolean));
    const fromCommaPlaces = await ensurePlaces(
      placeComma.split(',').map((s) => s.trim()).filter(Boolean)
    );
    const tag_ids = [...new Set([...selTagIds, ...fromCommaTags])];
    const place_ids = [...new Set([...selPlaceIds, ...fromCommaPlaces])];

    if (photoFile) {
      const fd = new FormData();
      fd.append('text', text);
      fd.append('emotion', emotion);
      if (imageUrl.trim()) fd.append('image_url', imageUrl.trim());
      tag_ids.forEach((id) => fd.append('tag_ids', String(id)));
      place_ids.forEach((id) => fd.append('place_ids', String(id)));
      fd.append('location', location.trim());
      fd.append('integration_ref', integrationRef.trim());
      fd.append('image', photoFile);
      await apiUpload('/moments/', fd);
    } else {
      await apiFetch('/moments/', {
        method: 'POST',
        body: JSON.stringify({
          text,
          emotion,
          image_url: imageUrl.trim(),
          tag_ids,
          place_ids,
          location: location.trim(),
          integration_ref: integrationRef.trim(),
        }),
      });
    }

    setOpenCreate(false);
    setText('');
    setEmotion('calm');
    setImageUrl('');
    setPhotoFile(null);
    setTagComma('');
    setPlaceComma('');
    setSelTagIds([]);
    setSelPlaceIds([]);
    setLocation('');
    setIntegrationRef('');
    await load();
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const fromCommaTags = await ensureTags(editTagComma.split(',').map((s) => s.trim()).filter(Boolean));
    const fromCommaPlaces = await ensurePlaces(
      editPlaceComma.split(',').map((s) => s.trim()).filter(Boolean)
    );
    const tag_ids = [...new Set([...editSelTagIds, ...fromCommaTags])];
    const place_ids = [...new Set([...editSelPlaceIds, ...fromCommaPlaces])];

    if (editPhotoFile) {
      const fd = new FormData();
      fd.append('text', editText);
      fd.append('emotion', editEmotion);
      if (editImageUrl.trim()) fd.append('image_url', editImageUrl.trim());
      tag_ids.forEach((id) => fd.append('tag_ids', String(id)));
      place_ids.forEach((id) => fd.append('place_ids', String(id)));
      fd.append('location', editLocation.trim());
      fd.append('integration_ref', editIntegrationRef.trim());
      fd.append('image', editPhotoFile);
      await apiUpload(`/moments/${selected.id}/`, fd, 'PATCH');
    } else {
      await apiFetch(`/moments/${selected.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          text: editText,
          emotion: editEmotion,
          image_url: editImageUrl.trim(),
          tag_ids,
          place_ids,
          location: editLocation.trim(),
          integration_ref: editIntegrationRef.trim(),
        }),
      });
    }
    setIsEditing(false);
    setOpenId(null);
    setEditPhotoFile(null);
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

  function resetCreateForm() {
    setText('');
    setEmotion('calm');
    setImageUrl('');
    setPhotoFile(null);
    setTagComma('');
    setPlaceComma('');
    setSelTagIds([]);
    setSelPlaceIds([]);
    setNewTagName('');
    setNewPlaceName('');
    setLocation('');
    setIntegrationRef('');
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
        lead="Запишите переживание, отметьте эмоцию, прикрепите фото с устройства или по ссылке, выберите или создайте теги и места."
      />
      <button
        type="button"
        className="editorial-cta"
        onClick={() => {
          resetCreateForm();
          setOpenCreate(true);
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
        <div
          className="overlay-backdrop"
          role="dialog"
          aria-modal
          onClick={() => {
            setOpenCreate(false);
            resetCreateForm();
          }}
        >
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h2 className="app-title" style={{ marginTop: 0 }}>
              Новый момент
            </h2>
            <p className="text-quiet" style={{ marginBottom: 20 }}>
              Что сейчас происходит и что вы чувствуете?
            </p>
            <form onSubmit={submitCreate}>
              <div className="field">
                <label>Текст</label>
                <textarea
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
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
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
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
                <label>Фото с устройства</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    setPhotoFile(e.target.files?.[0] || null);
                  }}
                />
                <p className="text-quiet" style={{ marginTop: 8, fontSize: 13 }}>
                  Если выбрали файл, ссылка ниже не обязательна — загруженное фото покажется в ленте.
                </p>
              </div>
              <div className="field">
                <label>Или ссылка на фото</label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="field">
                <label>Теги — нажмите, чтобы отметить</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      style={chipStyle(selTagIds.includes(t.id))}
                      onClick={() => setSelTagIds((prev) => toggleId(prev, t.id))}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Новый тег"
                    maxLength={64}
                    style={{ flex: '1 1 140px' }}
                  />
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => void addTagByName(newTagName, 'create')}
                  >
                    Добавить тег
                  </button>
                </div>
                <input
                  value={tagComma}
                  onChange={(e) => setTagComma(e.target.value)}
                  placeholder="Или несколько через запятую: прогулка, кофе"
                  style={{ marginTop: 10, width: '100%' }}
                />
              </div>
              <div className="field">
                <label>Места — свои ярлыки (парк, офис, дом…)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {places.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      style={chipStyle(selPlaceIds.includes(pl.id))}
                      onClick={() => setSelPlaceIds((prev) => toggleId(prev, pl.id))}
                    >
                      {pl.name}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    value={newPlaceName}
                    onChange={(e) => setNewPlaceName(e.target.value)}
                    placeholder="Новое место"
                    maxLength={120}
                    style={{ flex: '1 1 140px' }}
                  />
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => void addPlaceByName(newPlaceName, 'create')}
                  >
                    Сохранить место
                  </button>
                </div>
                <input
                  value={placeComma}
                  onChange={(e) => setPlaceComma(e.target.value)}
                  placeholder="Или несколько мест через запятую"
                  style={{ marginTop: 10, width: '100%' }}
                />
              </div>
              <div className="field">
                <label>Уточнение места (адрес, комната…)</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Необязательно"
                  maxLength={200}
                />
              </div>
              <div className="field">
                <label>Служебный ключ (необязательно)</label>
                <input
                  value={integrationRef}
                  onChange={(e) => setIntegrationRef(e.target.value)}
                  placeholder="Для интеграций с другими системами"
                  maxLength={120}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" className="primary-btn">
                  Сохранить момент
                </button>
                <button
                  type="button"
                  className="linkish"
                  onClick={() => {
                    setOpenCreate(false);
                    resetCreateForm();
                  }}
                >
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
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            {!isEditing ? (
              <>
                <div className="label-caps" style={{ letterSpacing: '0.14em' }}>
                  {formatTime(selected.created_at)}
                </div>
                <p style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--text)' }}>{selected.text}</p>
                {selected.places && selected.places.length > 0 ? (
                  <p className="text-quiet" style={{ marginTop: 8 }}>
                    Места: {selected.places.map((p) => p.name).join(', ')}
                  </p>
                ) : null}
                {selected.location ? (
                  <p className="text-quiet" style={{ marginTop: 4 }}>
                    Уточнение: {selected.location}
                  </p>
                ) : null}
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
                      setEditPhotoFile(null);
                      setEditTagComma('');
                      setEditPlaceComma('');
                      setEditSelTagIds(selected.tags.map((t) => t.id));
                      setEditSelPlaceIds((selected.places || []).map((p) => p.id));
                      setEditLocation(selected.location || '');
                      setEditIntegrationRef(selected.integration_ref || '');
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
                  <label>Новое фото с устройства</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => setEditPhotoFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="field">
                  <label>Ссылка на фото</label>
                  <input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} />
                </div>
                <div className="field">
                  <label>Теги</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {tags.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        style={chipStyle(editSelTagIds.includes(t.id))}
                        onClick={() => setEditSelTagIds((prev) => toggleId(prev, t.id))}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      value={editNewTagName}
                      onChange={(e) => setEditNewTagName(e.target.value)}
                      placeholder="Новый тег"
                      maxLength={64}
                      style={{ flex: '1 1 140px' }}
                    />
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => void addTagByName(editNewTagName, 'edit')}
                    >
                      Добавить тег
                    </button>
                  </div>
                  <input
                    value={editTagComma}
                    onChange={(e) => setEditTagComma(e.target.value)}
                    placeholder="Или через запятую"
                    style={{ marginTop: 10, width: '100%' }}
                  />
                </div>
                <div className="field">
                  <label>Места</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {places.map((pl) => (
                      <button
                        key={pl.id}
                        type="button"
                        style={chipStyle(editSelPlaceIds.includes(pl.id))}
                        onClick={() => setEditSelPlaceIds((prev) => toggleId(prev, pl.id))}
                      >
                        {pl.name}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      value={editNewPlaceName}
                      onChange={(e) => setEditNewPlaceName(e.target.value)}
                      placeholder="Новое место"
                      maxLength={120}
                      style={{ flex: '1 1 140px' }}
                    />
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => void addPlaceByName(editNewPlaceName, 'edit')}
                    >
                      Сохранить место
                    </button>
                  </div>
                  <input
                    value={editPlaceComma}
                    onChange={(e) => setEditPlaceComma(e.target.value)}
                    placeholder="Или места через запятую"
                    style={{ marginTop: 10, width: '100%' }}
                  />
                </div>
                <div className="field">
                  <label>Уточнение места</label>
                  <input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="field">
                  <label>Служебный ключ</label>
                  <input
                    value={editIntegrationRef}
                    onChange={(e) => setEditIntegrationRef(e.target.value)}
                    maxLength={120}
                  />
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
