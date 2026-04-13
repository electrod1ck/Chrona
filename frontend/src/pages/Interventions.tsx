import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../auth';
import { PageHeader } from '../components/PageHeader';

type Row = { id: number; title: string; description: string; effect_hint: string };

type Adapted = {
  id: number;
  inspiration_post: number | null;
  micro_intervention: number | null;
  generated_action: string;
  status: string;
  created_at: string;
};

type Focus =
  | { kind: 'adapted'; item: Adapted }
  | { kind: 'catalog'; row: Row }
  | null;

export function Interventions() {
  const { me } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [adaptedList, setAdaptedList] = useState<Adapted[]>([]);
  const [focus, setFocus] = useState<Focus>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<Row[]>('/interventions/').then(setRows);
  }, []);

  const refreshAdapted = useCallback(async () => {
    if (!me) {
      setAdaptedList([]);
      return;
    }
    try {
      const list = await apiFetch<Adapted[]>('/adapted-actions/');
      setAdaptedList(list);
    } catch {
      setAdaptedList([]);
    }
  }, [me]);

  useEffect(() => {
    void refreshAdapted();
  }, [refreshAdapted]);

  async function patchAdapted(item: Adapted, status: string, goMoments: boolean) {
    await apiFetch(`/adapted-actions/${item.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await refreshAdapted();
    setFocus(null);
    if (status === 'completed') {
      setToast('Действие отмечено как выполненное — закрепите момент в дневнике.');
      if (goMoments) {
        navigate('/app/moments', {
          state: {
            prefillFromAdapted: item.generated_action,
            integrationRef: `adapted:${item.id}`,
            promptCreateMoment: true,
          },
        });
      }
    } else if (status === 'later') {
      setToast('Добавили в Идеи — вернётесь к этому в удобный момент.');
    } else {
      setToast('Пропущено без оценки.');
    }
    setTimeout(() => setToast(null), 4000);
  }

  async function openCatalogAsAdapted(row: Row) {
    if (!me) {
      setFocus({ kind: 'catalog', row });
      return;
    }
    const created = await apiFetch<Adapted>('/adapted-actions/', {
      method: 'POST',
      body: JSON.stringify({ micro_intervention_id: row.id }),
    });
    setFocus({ kind: 'adapted', item: created });
    await refreshAdapted();
  }

  function closeFocus() {
    setFocus(null);
  }

  const pending = adaptedList.filter((a) => a.status === 'pending');
  const ideas = adaptedList.filter((a) => a.status === 'later');

  return (
    <div>
      <PageHeader
        eyebrow="Намерение"
        title="Микроинтервенции"
        lead="Короткое действие, короткое объяснение — выполнить сейчас, отложить или пропустить."
      />

      {toast ? (
        <p className="text-quiet" style={{ marginBottom: 20 }}>
          {toast}
        </p>
      ) : null}

      {me && pending.length > 0 ? (
        <div className="card" style={{ marginBottom: 28, padding: 20 }}>
          <h3 className="card-title" style={{ marginTop: 0 }}>
            Адаптированное действие
          </h3>
          <p className="text-quiet" style={{ marginBottom: 12 }}>
            Из ленты «Вдохновение» или из идеи ниже — откройте карточку, чтобы отметить результат.
          </p>
          <button
            type="button"
            className="primary-btn"
            onClick={() => setFocus({ kind: 'adapted', item: pending[0] })}
          >
            Открыть: {pending[0].generated_action.slice(0, 72)}
            {pending[0].generated_action.length > 72 ? '…' : ''}
          </button>
        </div>
      ) : null}
      {me && ideas.length > 0 ? (
        <div className="card" style={{ marginBottom: 28, padding: 20 }}>
          <h3 className="card-title" style={{ marginTop: 0 }}>
            Идеи на потом
          </h3>
          <p className="text-quiet" style={{ marginBottom: 12 }}>
            Здесь сохраняются микроинтервенции, которые вы отложили кнопкой «Позже».
          </p>
          <button
            type="button"
            className="primary-btn"
            onClick={() => setFocus({ kind: 'adapted', item: ideas[0] })}
          >
            Открыть идею: {ideas[0].generated_action.slice(0, 72)}
            {ideas[0].generated_action.length > 72 ? '…' : ''}
          </button>
        </div>
      ) : null}

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
            <p style={{ margin: '12px 0', color: 'var(--text)' }}>{r.description}</p>
            <p className="text-quiet" style={{ fontSize: 14 }}>
              Ожидаемый эффект на индекс: {r.effect_hint}
            </p>
            <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button
                type="button"
                className="primary-btn"
                onClick={() => void openCatalogAsAdapted(r)}
              >
                Попробовать сейчас
              </button>
              <button
                type="button"
                className="linkish"
                onClick={() => setToast('Идея остаётся в списке — вернётесь, когда будет удобно.')}
              >
                Позже
              </button>
            </div>
          </div>
        ))}
      </div>

      {focus ? (
        <div
          className="overlay-backdrop"
          role="dialog"
          aria-modal
          aria-labelledby="intv-title"
          onClick={closeFocus}
        >
          <div className="overlay-panel" onClick={(e) => e.stopPropagation()}>
            <h2 id="intv-title" className="card-title" style={{ marginTop: 0 }}>
              Почему это важно
            </h2>
            <p className="text-quiet" style={{ marginBottom: 16 }}>
              Маленький шаг внимания меняет ощущение дня — без гонки и отчётов.
            </p>
            <div className="card" style={{ padding: 22 }}>
              <h3 className="card-title" style={{ marginTop: 0 }}>
                {focus.kind === 'catalog' ? focus.row.title : 'Ваше действие'}
              </h3>
              <p style={{ margin: 0, lineHeight: 1.65, color: 'var(--text)' }}>
                {focus.kind === 'catalog'
                  ? focus.row.description
                  : focus.item.generated_action}
              </p>
              {focus.kind === 'catalog' ? (
                <p className="text-quiet" style={{ marginTop: 12, fontSize: 14 }}>
                  Эффект: {focus.row.effect_hint}
                </p>
              ) : null}
            </div>
            <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {focus.kind === 'adapted' ? (
                <>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => void patchAdapted(focus.item, 'completed', true)}
                  >
                    Выполнить сейчас
                  </button>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => void patchAdapted(focus.item, 'later', false)}
                  >
                    Позже
                  </button>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => void patchAdapted(focus.item, 'skipped', false)}
                  >
                    Пропустить
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="primary-btn" style={{ textDecoration: 'none' }}>
                    Войти, чтобы сохранить в БД
                  </Link>
                  <Link
                    to="/register?fresh=1"
                    className="linkish"
                    onClick={closeFocus}
                    style={{ display: 'inline-block' }}
                  >
                    Регистрация — затем моменты в БД
                  </Link>
                </>
              )}
              <button type="button" className="linkish" onClick={closeFocus}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
