import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { PageHeader } from '../components/PageHeader';

type Card = { id: number; quote: string };
type Pt = { date: string; value: number };

function smoothSeries(values: number[]): number[] {
  if (values.length < 3) return values;
  const out = [...values];
  for (let i = 1; i < values.length - 1; i++) {
    out[i] = (values[i - 1] + values[i] * 2 + values[i + 1]) / 4;
  }
  return out;
}

export function Insights() {
  const [cards, setCards] = useState<Card[]>([]);
  const [series, setSeries] = useState<Pt[]>([]);

  useEffect(() => {
    void Promise.all([
      apiFetch<Card[]>('/insights/'),
      apiFetch<Pt[]>('/insights/series/'),
    ]).then(([c, s]) => {
      setCards(c);
      setSeries(s);
    });
  }, []);

  const { d } = useMemo(() => {
    const w = 720;
    const h = 200;
    const pad = 16;
    if (series.length === 0) return { d: '' };
    const vals = smoothSeries(series.map((p) => p.value));
    const mx = Math.max(1, ...vals);
    const n = vals.length;
    const pts = vals.map((v, i) => ({
      x: pad + (n <= 1 ? w / 2 : (i / (n - 1)) * (w - pad * 2)),
      y: pad + (1 - v / mx) * (h - pad * 2),
    }));
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1];
      const q = pts[i];
      const cx = (p.x + q.x) / 2;
      path += ` Q ${p.x} ${p.y} ${cx} ${(p.y + q.y) / 2}`;
    }
    const last = pts[pts.length - 1];
    path += ` T ${last.x} ${last.y}`;
    return { d: path };
  }, [series]);

  const weekForecast = useMemo(() => {
    if (series.length < 4) return null;
    const vals = series.map((p) => p.value);
    const half = Math.floor(vals.length / 2);
    const a = vals.slice(0, half).reduce((x, y) => x + y, 0) / half;
    const b = vals.slice(half).reduce((x, y) => x + y, 0) / (vals.length - half);
    const diff = b - a;
    if (diff > 3) {
      return {
        line: 'По последним дням ритм чуть плотнее, чем в начале окна — хорошее время закрепить привычки.',
        risk: 'низкий',
      };
    }
    if (diff < -3) {
      return {
        line: 'Наблюдается мягкое снижение «плотности» дней — хороший момент заранее внести маленькое разнообразие.',
        risk: 'повышенный',
      };
    }
    return {
      line: 'Динамика ровная: монотонность не нарастает круто — можно спокойно планировать ритуалы.',
      risk: 'умеренный',
    };
  }, [series]);

  return (
    <div>
      <PageHeader
        eyebrow="Наблюдение"
        title="Инсайты"
        lead="Долгая динамика индекса, текстовые инсайты и простой прогноз на ближайшие дни по вашему ряду."
      />
      <details className="explainer">
        <summary>Как построен график и что означают карточки</summary>
        <div className="explainer__body">
          <p>
            <strong style={{ color: 'var(--text)' }}>Линия на графике</strong> показывает последние 14
            календарных дней. По оси Y — тот же индекс глубины дня, что и на главной (агрегат из
            ваших моментов за каждый день, хранится в базе как снимок). Если за день ещё не было
            записей, точка может быть у нуля. Перед отрисовкой значения слегка сглаживаются, чтобы
            линия была спокойнее для глаза.
          </p>
          <p>
            <strong style={{ color: 'var(--text)' }}>Карточки ниже</strong> — текстовые инсайты: для
            гостя показываются общие шаблоны; после входа подмешиваются и персональные фразы, если они
            есть в базе.
          </p>
        </div>
      </details>
      {weekForecast ? (
        <div className="card" style={{ marginBottom: 24, padding: 22 }}>
          <h3 className="card-title" style={{ marginTop: 0 }}>
            Прогноз на ближайшую неделю
          </h3>
          <p style={{ margin: '0 0 12px', color: 'var(--text)', lineHeight: 1.65 }}>{weekForecast.line}</p>
          <p className="text-quiet" style={{ margin: '0 0 12px', fontSize: 14 }}>
            Условный риск «сглаживания» недели: <strong style={{ color: 'var(--text)' }}>{weekForecast.risk}</strong>.
            Не медицинский прогноз, а ориентир по вашему ряду DailyIndex в приложении.
          </p>
          <Link to="/app/rituals" className="linkish">
            Перейти к планированию ритуалов →
          </Link>
        </div>
      ) : null}
      <div className="card" style={{ marginBottom: 40, padding: 24 }}>
        <svg width="100%" viewBox="0 0 720 200" aria-hidden>
          <path
            d={d}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.6}
          />
        </svg>
      </div>
      <div style={{ display: 'grid', gap: 20 }}>
        {cards.map((c) => (
          <blockquote key={c.id} className="card quote-card">
            {c.quote}
          </blockquote>
        ))}
      </div>
    </div>
  );
}
