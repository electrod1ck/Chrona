from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from chrona.models import (
    DailySnapshot,
    InsightCard,
    InspirationPost,
    MicroIntervention,
    MicroInvitation,
    Moment,
    Profile,
    Ritual,
    Tag,
)
from chrona.services import recompute_snapshot_for_day

User = get_user_model()


class Command(BaseCommand):
    help = 'Create demo user and sample Chrona data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            default='demo',
            help='Password for demo user (default: demo)',
        )

    def handle(self, *args, **options):
        password = options['password']
        user, created = User.objects.get_or_create(
            username='demo',
            defaults={
                'email': 'demo@chrona.local',
                'first_name': 'Ты',
            },
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS('Created user demo / %s' % password))
        else:
            user.set_password(password)
            user.save()
            self.stdout.write('Reset password for demo / %s' % password)

        profile, _ = Profile.objects.update_or_create(
            user=user,
            defaults={'display_name': 'Путешественник во времени'},
        )

        tags_data = ['прогулка', 'разговор', 'утро', 'тишина', 'работа']
        tags = []
        for name in tags_data:
            t, _ = Tag.objects.get_or_create(user=user, name=name)
            tags.append(t)

        MicroIntervention.objects.get_or_create(
            title='Тихая прогулка',
            defaults={
                'description': 'Пройди 10–15 минут без телефона и музыки',
                'effect_hint': '+0.12',
                'sort_order': 1,
            },
        )
        MicroIntervention.objects.get_or_create(
            title='Чай без экрана',
            defaults={
                'description': 'Поставь чайник и просто сиди у окна пару минут',
                'effect_hint': '+0.08',
                'sort_order': 2,
            },
        )

        InsightCard.objects.get_or_create(
            quote='Ты живёшь глубже, когда нет спешки утром',
            user=None,
            defaults={'sort_order': 1},
        )
        InsightCard.objects.get_or_create(
            quote='Короткие паузы между делами возвращают ощущение дня',
            user=None,
            defaults={'sort_order': 2},
        )

        MicroInvitation.objects.get_or_create(
            text='Оставь телефон на 10 минут и просто посмотри вокруг',
            defaults={'sort_order': 1, 'is_active': True},
        )
        MicroInvitation.objects.get_or_create(
            text='Запиши одно предложение о том, как сейчас пахнет воздух',
            defaults={'sort_order': 2, 'is_active': True},
        )

        Ritual.objects.get_or_create(
            user=user,
            title='Утренний свет',
            defaults={'frequency_label': 'каждое утро'},
        )
        Ritual.objects.get_or_create(
            user=user,
            title='Вечернее выключение',
            defaults={'frequency_label': 'перед сном'},
        )

        today = timezone.localdate()
        for i in range(90):
            d = today - timedelta(days=i)
            depth = 35 + (i % 7) * 8 + (20 if i % 5 == 0 else 0)
            depth = min(100.0, float(depth))
            DailySnapshot.objects.update_or_create(
                user=user,
                date=d,
                defaults={
                    'depth_index': depth,
                    'summary_line': (
                        'Ты прожил этот день глубже, чем обычно.'
                        if depth >= 55
                        else 'Спокойный день в твоём ритме.'
                    ),
                    'influences': 'прогулка, разговор' if depth >= 50 else '',
                },
            )

        if not Moment.objects.filter(user=user).exists():
            sample_texts = [
                'Свет на столе и тихий город за окном',
                'Разговор, который не торопился закончиться',
                'Долгий вдох перед следующим делом',
            ]
            emotions = [
                Moment.EMOTION_CALM,
                Moment.EMOTION_WARM,
                Moment.EMOTION_GROWTH,
            ]
            for idx, text in enumerate(sample_texts):
                m = Moment.objects.create(
                    user=user,
                    text=text,
                    emotion=emotions[idx % len(emotions)],
                )
                m.tags.add(tags[idx % len(tags)])

        for i in range(14):
            d = today - timedelta(days=i)
            recompute_snapshot_for_day(user, d)

        self._seed_inspiration()

        self.stdout.write(self.style.SUCCESS('Seed complete for user "%s"' % user.username))

    def _seed_inspiration(self):
        bot, _ = User.objects.get_or_create(
            username='chrona_inspire_bot',
            defaults={'email': 'inspire@chrona.local', 'first_name': 'Chrona'},
        )
        bot.set_unusable_password()
        bot.save()
        Profile.objects.get_or_create(
            user=bot,
            defaults={'display_name': 'Сообщество Chrona'},
        )
        if InspirationPost.objects.filter(author=bot).exists():
            return

        imgs = [
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80',
            'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&q=80',
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=900&q=80',
            'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=900&q=80',
            'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=900&q=80',
            'https://images.unsplash.com/photo-1518173946681-a4c8892bbd9f?w=900&q=80',
            'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=900&q=80',
            'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=900&q=80',
            'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80',
            'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=80',
            'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900&q=80',
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80',
            'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=900&q=80',
            'https://images.unsplash.com/photo-1475924152014-c16021a94a02?w=900&q=80',
        ]
        rows = [
            ('Мара', 'Сегодня не спорила с тревогой — просто посидели рядом у окна.', imgs[0]),
            ('Илья', 'Понял: усталость — это тоже информация, не слабость.', imgs[1]),
            ('Соня', 'Оставила телефон в другой комнате на час. Мир не рухнул.', imgs[2]),
            ('Раф', 'Прогулка без цели оказалась самым честным планом на вечер.', imgs[3]),
            ('Ника', 'Иногда достаточно одного глубокого вдоха, чтобы выбрать не спешить.', ''),
            ('Тим', 'Написал три строки в блокнот — и уже полегчало.', imgs[4]),
            ('Ася', 'Солнце на чашке чая — маленькое доказательство, что я здесь.', imgs[5]),
            ('Олег', 'Перестал ждать идеального момента. Начал с крошечного шага.', imgs[6]),
            ('Лена', 'Тишина в подъезде звучала как музыка.', ''),
            ('Кир', 'Спросил себя: что я сейчас реально чувствую? Ответ удивил.', imgs[7]),
            ('Даша', 'Увидела, как дерево растёт сквозь асфальт — и вспомнила про упрямую нежность.', imgs[8]),
            ('Миша', 'Не нужно успевать всё. Нужно успевать быть собой.', imgs[9]),
            ('Вера', 'Вечером перечитала старое письмо. Время — странная ткань.', ''),
            ('Женя', 'Помог кому-то улыбнуться — и сам забыл про спешку.', imgs[10]),
            ('Полина', 'Облака шли медленно. Я решила идти в том же темпе.', imgs[11]),
            ('Саша', 'Сложный вопрос лучше держать в руках, чем прятать под ковёр.', imgs[12]),
            ('Катя', 'Между двумя делами нашла паузу. Она стоила больше, чем чек-лист.', ''),
            ('Артём', 'Поругался с идеалом «надо всё». Остался с «достаточно сегодня».', imgs[13]),
            ('Юля', 'Слушала дождь и думала: сколько всего происходит без моего контроля.', ''),
            (
                'Денис',
                'Если завтра будет тяжело — это не приговор. Это погода внутри, она меняется.',
                '',
            ),
        ]
        for name, text, url in rows:
            InspirationPost.objects.create(
                author=bot,
                body=text,
                external_image_url=url,
                author_display_override=name,
            )
