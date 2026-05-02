# chrona/management/commands/sync_to_bitrix.py

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from chrona.bitrix.sync import sync_user_to_bitrix

User = get_user_model()


class Command(BaseCommand):
    help = "Синхронизирует всех пользователей Chrona с Битрикс24"

    def handle(self, *args, **options):
        users = User.objects.all()
        total = users.count()
        self.stdout.write(f"Найдено пользователей: {total}")

        success = 0
        failed = 0

        for user in users:
            result = sync_user_to_bitrix(user)
            if result.get("success") or result.get("skipped"):
                success += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✓ {user.email} → {result.get('action', 'skipped')} "
                        f"(Битрикс ID: {result.get('bitrix_id', '—')})"
                    )
                )
            else:
                failed += 1
                self.stdout.write(
                    self.style.ERROR(f"  ✗ {user.email} → ошибка")
                )

        self.stdout.write(f"\nГотово: {success} успешно, {failed} ошибок")