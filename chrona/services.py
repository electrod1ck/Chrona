"""Domain helpers: DailyIndex messaging and strip interpolation."""

from __future__ import annotations

import statistics
from datetime import date

from .models import DailySnapshot, Moment

HERO_LINES_HIGH = [
    'Сегодня ты чуть глубже в своём времени',
    'Ты замедлился — и это видно',
    'День наполняется осознанностью',
]

HERO_LINES_MID = [
    'Твой день разворачивается мягко',
    'Ты здесь — в своём ритме',
    'Время течёт спокойно',
]

HERO_LINES_LOW = [
    'Можно позволить дню быть тише',
    'Небольшие шаги — тоже присутствие',
    'Мягкий день тоже ценен',
]


def _avg_depth_for_user(user, days: int = 30) -> float | None:
    qs = DailySnapshot.objects.filter(user=user).order_by('-date')[:days]
    values = [s.depth_index for s in qs]
    if not values:
        return None
    return float(statistics.mean(values))


def hero_message_for_today(user, today: date | None = None) -> str:
    today = today or date.today()
    snap = DailySnapshot.objects.filter(user=user, date=today).first()
    if not snap:
        pool = HERO_LINES_MID
    else:
        avg = _avg_depth_for_user(user)
        if avg is None:
            pool = HERO_LINES_MID if snap.depth_index >= 45 else HERO_LINES_LOW
        else:
            delta = snap.depth_index - avg
            if snap.depth_index >= 65 or delta >= 8:
                pool = HERO_LINES_HIGH
            elif snap.depth_index >= 40 or delta >= -5:
                pool = HERO_LINES_MID
            else:
                pool = HERO_LINES_LOW
    idx = (user.id + today.toordinal()) % len(pool)
    return pool[idx]


def daily_index_today(user, today: date | None = None) -> float:
    today = today or date.today()
    snap = DailySnapshot.objects.filter(user=user, date=today).first()
    if snap:
        return float(snap.depth_index)
    # Fallback from today's moments count
    count = Moment.objects.filter(
        user=user,
        created_at__date=today,
    ).count()
    return min(100.0, 35.0 + count * 12.0)


def accent_saturation_from_index(index: float) -> float:
    """0–1 scale for CSS (e.g. mix with cream)."""
    return max(0.0, min(1.0, index / 100.0))


def recompute_snapshot_for_day(user, day: date) -> DailySnapshot:
    """Derive depth_index from moments on that day if no manual row."""
    moments = Moment.objects.filter(user=user, created_at__date=day)
    base = 30.0 + min(50.0, moments.count() * 10.0)
    emotion_boost = {'warm': 6, 'growth': 8, 'deep': 10, 'calm': 4}
    extra = sum(emotion_boost.get(m.emotion, 0) for m in moments) * 0.15
    depth = min(100.0, base + extra)
    influences = []
    for m in moments[:3]:
        for t in m.tags.all()[:2]:
            if t.name not in influences:
                influences.append(t.name)
    inf = ', '.join(influences[:4]) if influences else ''
    summary = (
        'Ты прожил этот день глубже, чем обычно.'
        if depth >= 55
        else 'Спокойный день в твоём ритме.'
    )
    snap, _ = DailySnapshot.objects.update_or_create(
        user=user,
        date=day,
        defaults={
            'depth_index': depth,
            'summary_line': summary,
            'influences': inf,
        },
    )
    return snap


def ensure_snapshots(user, days: int = 30) -> None:
    """Backfill recent days from moments (idempotent-ish)."""
    from datetime import timedelta

    today = date.today()
    for i in range(days):
        d = today - timedelta(days=i)
        if not DailySnapshot.objects.filter(user=user, date=d).exists():
            recompute_snapshot_for_day(user, d)
