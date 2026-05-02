# chrona/bitrix/sync.py

import logging
from django.conf import settings
from .client import BitrixClient

logger = logging.getLogger(__name__)

client = BitrixClient()


def _build_contact_fields(user) -> dict:
    """
    Собирает словарь полей контакта из объекта User + Profile + связанных моделей.
    Это главная функция маппинга ПР-04 → Битрикс24.
    """
    # Получаем Profile если есть
    profile = getattr(user, "chrona_profile", None)

    # Имя — берём из Profile.display_name, иначе username
    display_name = (
        profile.display_name if profile and profile.display_name
        else user.username
    )

    # Разбиваем имя на части для Битрикс24
    name_parts = display_name.strip().split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    # Считаем количество моментов и ритуалов
    moments_count = user.moments.count()
    rituals_count = user.rituals.count()

    # Дата регистрации в формате ISO
    registered_at = user.date_joined.isoformat() if user.date_joined else ""

    # Собираем поля
    fields = {
        "NAME": first_name,
        "LAST_NAME": last_name,
        "EMAIL": [{"VALUE": user.email, "VALUE_TYPE": "WORK"}],
        "SOURCE_ID": "WEB",
        "SOURCE_DESCRIPTION": "Chrona Web App — автоматическая синхронизация",

        # Кастомные поля — замени коды на свои из Шага 1
        settings.BITRIX_FIELD_AGE: profile.age if profile and profile.age else None,
        settings.BITRIX_FIELD_BIO: profile.bio if profile and profile.bio else "",
        settings.BITRIX_FIELD_REGISTERED: registered_at,
        settings.BITRIX_FIELD_MOMENTS: moments_count,
        settings.BITRIX_FIELD_RITUALS: rituals_count,
    }

    # Убираем None значения чтобы не затирать уже существующие данные
    return {k: v for k, v in fields.items() if v is not None}


def sync_user_to_bitrix(user) -> dict:
    """
    Главная функция синхронизации.
    Если контакт с таким email уже есть — обновляет.
    Если нет — создаёт новый.
    Вызывается из сигнала после регистрации или обновления профиля.
    """
    if not user.email:
        logger.warning("User %s не имеет email — синхронизация пропущена", user.pk)
        return {"skipped": True, "reason": "no email"}

    fields = _build_contact_fields(user)

    # Проверяем существует ли контакт
    existing_id = client.find_contact_by_email(user.email)

    if existing_id:
        # Контакт уже есть — обновляем
        success = client.update_contact(existing_id, fields)
        if not success:
            return {
                "action": "updated",
                "bitrix_id": existing_id,
                "success": False,
                "error": getattr(client, 'last_error', None),
            }
        return {"action": "updated", "bitrix_id": existing_id, "success": True}
    else:
        # Контакта нет — создаём
        new_id = client.create_contact(fields)
        if not new_id:
            return {"action": "created", "bitrix_id": None, "success": False, "error": getattr(client, 'last_error', None)}
        return {"action": "created", "bitrix_id": new_id, "success": True}