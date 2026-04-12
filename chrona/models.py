from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chrona_profile',
    )
    display_name = models.CharField(max_length=120, blank=True)
    avatar_url = models.URLField(blank=True)
    avatar_image = models.ImageField(upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(blank=True, help_text='О себе — сохраняется в БД')

    def __str__(self):
        return self.display_name or self.user.get_username()


class Tag(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chrona_tags',
    )
    name = models.CharField(max_length=64)

    class Meta:
        unique_together = [('user', 'name')]

    def __str__(self):
        return self.name


class Moment(models.Model):
    EMOTION_CALM = 'calm'
    EMOTION_WARM = 'warm'
    EMOTION_GROWTH = 'growth'
    EMOTION_DEEP = 'deep'
    EMOTION_CHOICES = [
        (EMOTION_CALM, 'calm'),
        (EMOTION_WARM, 'warm'),
        (EMOTION_GROWTH, 'growth'),
        (EMOTION_DEEP, 'deep'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='moments',
    )
    text = models.TextField()
    emotion = models.CharField(
        max_length=16,
        choices=EMOTION_CHOICES,
        default=EMOTION_CALM,
    )
    image_url = models.URLField(blank=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name='moments')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.text[:40]


class DailySnapshot(models.Model):
    """One row per user per calendar day — drives hero copy and 30-day strip."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_snapshots',
    )
    date = models.DateField()
    depth_index = models.FloatField(
        help_text='0–100, higher = more “present” day per product logic',
    )
    summary_line = models.CharField(
        max_length=280,
        blank=True,
        help_text='Short line for strip tooltip',
    )
    influences = models.CharField(
        max_length=200,
        blank=True,
        help_text='Comma-separated hints, e.g. “прогулка, разговор”',
    )

    class Meta:
        unique_together = [('user', 'date')]
        ordering = ['-date']

    def __str__(self):
        return f'{self.user_id} {self.date} {self.depth_index}'


class Ritual(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rituals',
    )
    title = models.CharField(max_length=120)
    frequency_label = models.CharField(
        max_length=64,
        help_text='e.g. “каждое утро”',
    )
    last_completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title


class MicroIntervention(models.Model):
    """Curated suggestions — not per-user in MVP."""

    title = models.CharField(max_length=120)
    description = models.TextField()
    effect_hint = models.CharField(max_length=32, default='+0.12')
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.title


class InsightCard(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='insight_cards',
        null=True,
        blank=True,
        help_text='Null = global template copy',
    )
    quote = models.TextField()
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.quote[:50]


class MicroInvitation(models.Model):
    """Right panel on dashboard — soft prompts."""

    text = models.TextField()
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['sort_order', 'id']

    def __str__(self):
        return self.text[:40]


class GuestBookEntry(models.Model):
    """Сообщения от посетителей без аккаунта — публичная гостевая книга."""

    display_name = models.CharField(max_length=80, blank=True)
    message = models.TextField(max_length=600)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.message[:40]


class MoodPulse(models.Model):
    """Анонимный «пульс дня»: выбор настроения, агрегируется в статистике."""

    MOOD_CALM = 'calm'
    MOOD_WARM = 'warm'
    MOOD_LIGHT = 'light'
    MOOD_DEEP = 'deep'
    MOOD_CHOICES = [
        (MOOD_CALM, 'calm'),
        (MOOD_WARM, 'warm'),
        (MOOD_LIGHT, 'light'),
        (MOOD_DEEP, 'deep'),
    ]

    mood = models.CharField(max_length=16, choices=MOOD_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return self.mood


class UserNote(models.Model):
    """Личные заметки пользователя (CRUD в БД)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chrona_notes',
    )
    title = models.CharField(max_length=120, blank=True)
    body = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return (self.title or self.body)[:40]


class InspirationPost(models.Model):
    """Общая лента «Вдохновение»: мысли и фото (загрузка или внешняя ссылка)."""

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='inspiration_posts',
    )
    body = models.TextField(max_length=2000)
    image = models.ImageField(upload_to='inspiration/%Y/%m/', blank=True, null=True)
    external_image_url = models.URLField(blank=True, max_length=500)
    author_display_override = models.CharField(
        max_length=80,
        blank=True,
        help_text='Подпись автора для демо-постов (иначе — имя из профиля)',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.body[:50]
