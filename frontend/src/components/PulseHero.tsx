import { useEffect, useId, useState } from 'react';

type Props = {
  value: number;
  message: string;
  saturation: number;
};

export function PulseHero({ value, message, saturation }: Props) {
  const gid = useId();
  const gradId = `grad-${gid}`;
  const size = 260;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const [offset, setOffset] = useState(c);

  useEffect(() => {
    const t = requestAnimationFrame(() => setOffset(c * (1 - pct)));
    return () => cancelAnimationFrame(t);
  }, [c, pct]);

  return (
    <div className="block-gap pulse-hero" style={{ textAlign: 'center' }}>
      <div style={{ display: 'inline-block', position: 'relative' }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.08 + saturation * 0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.45 + saturation * 0.5} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--subtle)"
            strokeWidth={stroke}
            opacity={0.5}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            pointerEvents: 'none',
          }}
        >
          <div className="pulse-hero__value">{Math.round(value)}</div>
        </div>
      </div>
      <p className="pulse-hero__caption">{message}</p>
    </div>
  );
}
