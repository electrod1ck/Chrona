import { useMemo, useState } from 'react';

export type DayBar = {
  date: string;
  depth_index: number;
  summary_line: string;
  influences: string;
};

function interpolateColor(t: number): string {
  const a = [212, 203, 184];
  const b = [30, 74, 58];
  const mix = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
}

function formatRuDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function DayStrip({ days }: { days: DayBar[] }) {
  const [tip, setTip] = useState<{
    x: number;
    y: number;
    day: DayBar;
  } | null>(null);

  const maxH = 64;
  const minH = 8;

  const heights = useMemo(() => {
    const vals = days.map((d) => d.depth_index);
    const mx = Math.max(1, ...vals);
    return days.map((d) => {
      const t = d.depth_index / mx;
      return minH + t * (maxH - minH);
    });
  }, [days]);

  return (
    <div className="block-gap" style={{ position: 'relative' }}>
      <h2 className="editorial-section-title">След жизни · 30 дней</h2>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          minHeight: maxH + 8,
          padding: '8px 0',
        }}
      >
        {days.map((d, i) => {
          const t = Math.max(0, Math.min(1, d.depth_index / 100));
          const h = heights[i];
          const bg = interpolateColor(t);
          return (
            <button
              key={d.date}
              type="button"
              className="hover-lift"
              title={formatRuDate(d.date)}
              onMouseEnter={(e) => {
                const r = (e.target as HTMLElement).getBoundingClientRect();
                setTip({
                  x: r.left + r.width / 2,
                  y: r.top,
                  day: d,
                });
              }}
              onMouseLeave={() => setTip(null)}
              style={{
                width: 12,
                height: h,
                borderRadius: 6,
                border: 'none',
                padding: 0,
                cursor: 'default',
                background: bg,
                transition: 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          );
        })}
      </div>
      {tip && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: tip.x,
            top: tip.y - 8,
            transform: 'translate(-50%, -100%)',
            background: 'var(--card)',
            color: 'var(--text)',
            padding: '14px 16px',
            borderRadius: 14,
            maxWidth: 280,
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            zIndex: 20,
            pointerEvents: 'none',
            lineHeight: 1.5,
          }}
        >
          <div className="text-quiet" style={{ marginBottom: 8, fontSize: 13 }}>
            {formatRuDate(tip.day.date)}
          </div>
          <div style={{ fontSize: 16, fontFamily: 'var(--font-display)' }}>
            {tip.day.summary_line || 'День в твоём ритме.'}
          </div>
          {tip.day.influences ? (
            <div className="text-quiet" style={{ marginTop: 10, fontSize: 13 }}>
              Больше всего влияло: {tip.day.influences}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
