import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { PageHeader } from '../components/PageHeader';

type Point = { date: string; depth: number; emotion_tone: number };

function buildSmoothPath(xs: number[], ys: number[], w: number, h: number): string {
  if (xs.length === 0) return '';
  const pts = xs.map((x, i) => ({ x, y: ys[i] }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function ExperienceMap() {
  const [points, setPoints] = useState<Point[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  const [card, setCard] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    void apiFetch<{ points: Point[]; is_demo?: boolean }>('/experience-map/').then((r) => {
      setPoints(r.points);
      setIsDemo(!!r.is_demo);
    });
  }, []);

  const { pathD, areaD, xs, ys, w, h } = useMemo(() => {
    const w = 900;
    const h = 320;
    const pad = 24;
    if (points.length === 0) {
      return { pathD: '', areaD: '', xs: [] as number[], ys: [] as number[], w, h };
    }
    const depths = points.map((p) => p.depth);
    const mx = Math.max(1, ...depths);
    const n = points.length;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < n; i++) {
      xs.push(pad + (n <= 1 ? (w - pad * 2) / 2 : (i / (n - 1)) * (w - pad * 2)));
      ys.push(pad + (1 - depths[i] / mx) * (h - pad * 2));
    }
    const line = buildSmoothPath(xs, ys, w, h);
    const area =
      line +
      ` L ${xs[xs.length - 1]} ${h - pad} L ${xs[0]} ${h - pad} Z`;
    return { pathD: line, areaD: area, xs, ys, w, h };
  }, [points]);

  const segmentHint = (idx: number): string => {
    const p = points[idx];
    if (!p) return '';
    if (p.depth >= 60) {
      return 'В этот период ты чаще был один и это усиливало восприятие';
    }
    if (p.depth >= 40) {
      return 'Ритм был ровным — много маленьких якорей внимания';
    }
    return 'Больше отдыха и тишины — тело просило замедлиться';
  };

  return (
    <div>
      <PageHeader
        eyebrow="Пейзаж"
        title="Карта опыта"
        lead="Время по горизонтали, плотность опыта по вертикали. Цвет — мягкий эмоциональный тон."
      />
      <details className="explainer">
        <summary>Как устроена карта за 90 дней</summary>
        <div className="explainer__body">
          <p>
            По горизонтали — последние 90 дней, слева направо от старых к новым. По вертикали —
            относительная «высота» дня: это индекс глубины из ваших данных (те же снимки дней, что на
            главной и в инсайтах), нормированный на максимум в этом окне, чтобы форма кривой была
            читаемой.
          </p>
          <p>
            Заливка под линией и сама линия — визуальный рельеф, без отдельной шкалы чисел: смысл в
            ритме, а не в точных цифрах. Клик по вертикальной зоне открывает короткую интерпретацию
            характера отрезка (эвристика по уровню линии, не диагноз).
          </p>
        </div>
      </details>
      {isDemo ? (
        <p className="text-quiet" style={{ marginBottom: 20, textTransform: 'none' }}>
          Демо-карта для гостей. После входа здесь отобразятся ваши снимки глубины из базы.
        </p>
      ) : null}
      <div style={{ position: 'relative' }}>
        <svg
          width="100%"
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label="Органическая карта опыта за 90 дней"
          onMouseLeave={() => {
            setHover(null);
            setCard(null);
          }}
        >
          <defs>
            <linearGradient id="mapFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#mapFill)" />
          <path
            d={pathD}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2}
            opacity={0.85}
            strokeLinecap="round"
          />
          {xs.map((x, i) => (
            <rect
              key={i}
              x={x - 5}
              y={0}
              width={10}
              height={h}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover({ idx: i, x, y: ys[i] })}
              onClick={(e) => {
                const r = (e.target as SVGRectElement).getBoundingClientRect();
                setCard({
                  x: r.left + r.width / 2,
                  y: r.top,
                  text: segmentHint(i),
                });
              }}
            />
          ))}
          {hover ? (
            <circle cx={hover.x} cy={hover.y} r={6} fill="var(--primary)" opacity={0.9} />
          ) : null}
        </svg>
        {card ? (
          <div
            style={{
              position: 'fixed',
              left: card.x,
              top: card.y,
              transform: 'translate(-50%, -108%)',
              maxWidth: 300,
              background: 'var(--card)',
              color: 'var(--text)',
              padding: '16px 18px',
              borderRadius: 16,
              boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
              zIndex: 30,
              lineHeight: 1.5,
            }}
          >
            {card.text}
            <div style={{ marginTop: 10 }}>
              <button type="button" className="linkish" onClick={() => setCard(null)}>
                Закрыть
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
