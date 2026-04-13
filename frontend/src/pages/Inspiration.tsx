import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, apiUpload } from '../api';
import { useAuth } from '../auth';
import { PageHeader } from '../components/PageHeader';

type Post = {
  id: number;
  title?: string;
  body: string;
  image_url: string;
  author_name: string;
  created_at: string;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Inspiration() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Post[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [extUrl, setExtUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await apiFetch<Post[]>('/inspiration/');
    setItems(list);
  }, []);

  useEffect(() => {
    void load().catch(() => {});
  }, [load]);

  async function publishJson(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const t = body.trim();
    if (t.length < 3) {
      setErr('Напишите хотя бы пару слов.');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/inspiration/', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim() || undefined,
          body: t,
          external_image_url: extUrl.trim() || undefined,
        }),
      });
      setTitle('');
      setBody('');
      setExtUrl('');
      await load();
    } catch {
      setErr('Не удалось опубликовать. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  async function publishWithFile(file: File) {
    setErr(null);
    const t = body.trim();
    if (t.length < 3) {
      setErr('Сначала напишите текст, затем выберите файл.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('body', t);
      if (title.trim()) fd.append('title', title.trim());
      fd.append('image', file);
      await apiUpload('/inspiration/', fd);
      setTitle('');
      setBody('');
      setExtUrl('');
      await load();
    } catch {
      setErr('Не удалось опубликовать. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Сообщество"
        title="Вдохновение"
        lead="Чужие мысли и кадры — можно взять идею в свою практику одним нажатием."
      />

      {me ? (
        <form className="card" style={{ marginBottom: 40, padding: 24 }} onSubmit={(e) => void publishJson(e)}>
          <h3 className="card-title" style={{ marginTop: 0 }}>
            Поделиться
          </h3>
          <div className="field">
            <label>Заголовок (необязательно)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Короткая строка над текстом"
            />
          </div>
          <div className="field">
            <label>Текст</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              placeholder="Что вдохновило, остановило или заставило задуматься?"
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
          <div className="field">
            <label>Картинка с устройства (необязательно)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={busy}
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                ev.target.value = '';
                if (f) void publishWithFile(f);
              }}
            />
          </div>
          <div className="field">
            <label>Или ссылка на фото (необязательно)</label>
            <input
              value={extUrl}
              onChange={(e) => setExtUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {err ? <p style={{ color: 'var(--warm)', fontSize: 14 }}>{err}</p> : null}
          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? 'Публикация…' : 'Опубликовать'}
          </button>
        </form>
      ) : (
        <p className="text-quiet" style={{ marginBottom: 32 }}>
          Войдите, чтобы публиковать в ленте. Гости могут только читать.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {items.map((p) => (
          <article key={p.id} className="card" style={{ padding: 22 }}>
            <div className="text-quiet" style={{ fontSize: 13, marginBottom: 10 }}>
              <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{p.author_name}</strong>
              {' · '}
              {formatWhen(p.created_at)}
            </div>
            {p.image_url ? (
              <img
                src={p.image_url}
                alt=""
                style={{
                  width: '100%',
                  maxHeight: 420,
                  objectFit: 'cover',
                  borderRadius: 12,
                  marginBottom: 14,
                }}
              />
            ) : null}
            {p.title ? (
              <h3 className="card-title" style={{ margin: '0 0 10px' }}>
                {p.title}
              </h3>
            ) : null}
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
              {p.body}
            </p>
            {me ? (
              <button
                type="button"
                className="primary-btn"
                style={{ marginTop: 16 }}
                onClick={() =>
                  void (async () => {
                    await apiFetch('/adapted-actions/', {
                      method: 'POST',
                      body: JSON.stringify({ inspiration_post_id: p.id }),
                    });
                    navigate('/app/interventions');
                  })()
                }
              >
                Адаптировать под меня
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
