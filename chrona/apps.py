from django.apps import AppConfig


def _configure_sqlite(sender, connection, **kwargs):
    if connection.vendor != 'sqlite':
        return
    with connection.cursor() as cursor:
        cursor.execute('PRAGMA journal_mode=WAL;')
        cursor.execute('PRAGMA synchronous=NORMAL;')
        cursor.execute('PRAGMA busy_timeout=30000;')


class ChronaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chrona'
    verbose_name = 'Chrona'

    def ready(self):
        from django.db.backends.signals import connection_created

        connection_created.connect(_configure_sqlite)

class ChronaConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "chrona"

    def ready(self):
        # Подключаем сигналы при старте приложения
        import chrona.signals  # noqa