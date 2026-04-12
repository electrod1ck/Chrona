import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { PageHeader } from '../components/PageHeader';

type Note = {
  id: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export function Notes() {
  const [items, setItems] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(() => {
    void apiFetch<Note[]>('/notes/').then(setItems);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(n: Note) {
    setEditingId(n.id);
    setTitle(n.title);
    setBody(n.body);
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setBody('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    if (editingId != null) {
      await apiFetch(`/notes/${editingId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
    } else {
      await apiFetch('/notes/', {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
    }
    resetForm();
    load();
  }

  async function remove(id: number) {
    if (!confirm('Удалить заметку?')) return;
    await apiFetch(`/notes/${id}/`, { method: 'DELETE' });
    if (editingId === id) resetForm();
    load();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Личное"
        title="Заметки"
        lead="Короткие записи только для вас — хранятся в базе, можно править и удалять."
      />

      <form onSubmit={onSubmit} className="card" style={{ marginBottom: 32, padding: 24 }}>
        <h2 className="card-title" style={{ marginBottom: 16 }}>
          {editingId != null ? 'Правка заметки' : 'Новая заметка'}
        </h2>
        <div className="field">
          <label>Заголовок (необязательно)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </div>
        <div className="field">
          <label>Текст</label>
          <textarea
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
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
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="submit" className="primary-btn">
            {editingId != null ? 'Сохранить' : 'Добавить в БД'}
          </button>
          {editingId != null ? (
            <button type="button" className="linkish" onClick={resetForm}>
              Отмена
            </button>
          ) : null}
        </div>
      </form>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((n) => (
          <li key={n.id} className="card hover-lift" style={{ marginBottom: 14, padding: 20 }}>
            {n.title ? <h3 className="card-title">{n.title}</h3> : null}
            <p style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>{n.body}</p>
            <p className="text-quiet" style={{ fontSize: 12, marginBottom: 12 }}>
              Обновлено: {new Date(n.updated_at).toLocaleString('ru-RU')}
            </p>
            <button type="button" className="linkish" style={{ marginRight: 16 }} onClick={() => startEdit(n)}>
              Изменить
            </button>
            <button type="button" className="linkish" onClick={() => void remove(n.id)}>
              Удалить
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
