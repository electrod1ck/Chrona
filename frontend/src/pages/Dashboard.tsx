import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { apiFetch } from '../api';
import { DayStrip, type DayBar } from '../components/DayStrip';
import { GuestEngagement } from '../components/GuestEngagement';
import { PulseHero } from '../components/PulseHero';

type Dashboard = {
  daily_index: number;
  hero_message: string;
  accent_saturation: number;
  invitations: { id: number; text: string }[];
};

type PublicPreview = Dashboard & {
  daily_strip: DayBar[];
  is_demo: boolean;
};

export function Dashboard() {
  const { me, loading: authLoading } = useAuth();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [strip, setStrip] = useState<DayBar[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        if (me) {
          const [d, s] = await Promise.all([
            apiFetch<Dashboard>('/dashboard/'),
            apiFetch<DayBar[]>('/daily-strip/'),
          ]);
          if (!cancelled) {
            setDash(d);
            setStrip(s);
            setIsDemo(false);
          }
        } else {
          const p = await apiFetch<PublicPreview>('/public/dashboard-preview/');
          if (!cancelled) {
            setDash({
              daily_index: p.daily_index,
              hero_message: p.hero_message,
              accent_saturation: p.accent_saturation,
              invitations: p.invitations,
            });
            setStrip(p.daily_strip || []);
            setIsDemo(!!p.is_demo);
          }
        }
      } catch (e) {
        if (!cancelled) setErr(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me, authLoading]);

  if (authLoading || (!dash && !err)) {
    return <p className="text-quiet">Загрузка…</p>;
  }
  if (err) return <p>{err}</p>;
  if (!dash) return null;

  return (
    <div>
      <section className="editorial-hero" aria-labelledby="dash-hero-title">
        <p className="editorial-hero__eyebrow">Ваш день</p>
        <h1 id="dash-hero-title" className="editorial-hero__title">
          Место, где слышно время
        </h1>
        <p className="editorial-hero__lead">
          Как в тихом заповеднике: мало сигналов, много пространства для того, что действительно
          происходит с вами.
        </p>
      </section>

      {!me ? <GuestEngagement /> : null}

      {isDemo ? (
        <p className="text-quiet" style={{ marginBottom: 24, textTransform: 'none' }}>
          Сейчас показан демо-след — после входа здесь будут ваши настоящие данные из базы.
        </p>
      ) : null}

      <details className="explainer">
        <summary>Откуда берётся круг и полоски дней?</summary>
        <div className="explainer__body">
          <p>
            <strong style={{ color: 'var(--text)' }}>Число в круге (пульс дня)</strong> — условный
            индекс «глубины» за сегодня (от 0 до 100). Он пересчитывается из ваших моментов за этот
            день: настроение, объём записи и число заметок. Это не медицинская метрика, а мягкий
            снимок внимания — чем выше значение, тем насыщеннее день выглядит в дневнике.
          </p>
          <p>
            <strong style={{ color: 'var(--text)' }}>Кольцо вокруг</strong> заполняется пропорционально
            этому индексу; насыщенность цвета слегка усиливается вместе с числом.
          </p>
          <p>
            <strong style={{ color: 'var(--text)' }}>«След жизни · 30 дней»</strong> — по одной
            вертикальной полоске на каждый календарный день. Высота и оттенок соответствуют
            сохранённому в базе индексу глубины за этот день (те же снимки, что питают круг, только
            по истории). Наведите курсор — увидите дату и короткую строку-пояснение из базы.
          </p>
        </div>
      </details>

      <div className="dashboard-grid">
        <div>
          <PulseHero
            value={dash.daily_index}
            message={dash.hero_message}
            saturation={dash.accent_saturation}
          />
          {strip.length > 0 ? <DayStrip days={strip} /> : null}
        </div>
        <aside style={{ position: 'sticky', top: 32 }}>
          <h2 className="editorial-aside-title">Мягкие приглашения</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {dash.invitations.map((inv) => (
              <div key={inv.id} className="card hover-lift">
                <p style={{ margin: 0, fontSize: 15 }}>{inv.text}</p>
                <button type="button" className="linkish" style={{ marginTop: 14 }}>
                  Заметить это
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
