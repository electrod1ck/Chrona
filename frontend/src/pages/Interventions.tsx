import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { PageHeader } from '../components/PageHeader';

type Row = { id: number; title: string; description: string; effect_hint: string };

export function Interventions() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void apiFetch<Row[]>('/interventions/').then(setRows);
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Намерение"
        title="Мягкие идеи"
        lead="Без дедлайнов. Без давления. Только приглашения."
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 24,
        }}
      >
        {rows.map((r) => (
          <div
            key={r.id}
            className="card hover-lift"
            style={{ padding: 28, borderRadius: 20 }}
          >
            <h2 className="card-title">{r.title}</h2>
            <p style={{ margin: '12px 0' }}>{r.description}</p>
            <p className="text-quiet" style={{ fontSize: 14 }}>
              Эффект: {r.effect_hint}
            </p>
            <div style={{ marginTop: 20, display: 'flex', gap: 16 }}>
              <button type="button" className="primary-btn">
                Попробовать сейчас
              </button>
              <button type="button" className="linkish">
                Позже
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
