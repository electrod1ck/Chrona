import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class BitrixClient:
    """
    Минимальный клиент для работы с Битрикс24 REST API через входящий webhook.
    """

    def __init__(self):
        self.webhook_url = getattr(settings, "BITRIX_WEBHOOK_URL", "")
        # last_error holds the last HTTP error/status/text for diagnostics
        self.last_error: dict | None = None

    def _call(self, method: str, params: dict) -> dict:
        """
        Универсальный метод вызова любого метода Битрикс24 API.
        """
        if not self.webhook_url:
            logger.warning("BITRIX_WEBHOOK_URL не задан — интеграция отключена")
            return {}

        url = f"{self.webhook_url.rstrip('/')}/{method}.json"

        try:
            response = requests.post(url, json=params, timeout=5)
            response.raise_for_status()
            data = response.json()

            # Clear last_error on success
            self.last_error = None

            if "error" in data:
                logger.error("Битрикс24 вернул ошибку: %s — %s",
                             data.get("error"), data.get("error_description"))
                self.last_error = {
                    "error": data.get("error"),
                    "error_description": data.get("error_description"),
                    "status_code": response.status_code,
                    "response": data,
                }
                return {}

            return data

        except requests.exceptions.Timeout:
            logger.error("Битрикс24 API: таймаут запроса к %s", method)
            self.last_error = {"exception": "timeout", "method": method}
            return {}
        except requests.exceptions.RequestException as e:
            # Try to extract response details if available
            status = None
            text = None
            try:
                status = e.response.status_code if getattr(e, 'response', None) else None
                text = e.response.text if getattr(e, 'response', None) else None
            except Exception:
                text = str(e)

            logger.error("Битрикс24 API: ошибка запроса: %s (status=%s) body=%s", e, status, text)
            self.last_error = {"exception": str(e), "status_code": status, "response_text": text, "method": method}
            return {}

    def find_contact_by_email(self, email: str) -> int | None:
        """
        Ищет контакт в Битрикс24 по email.
        Возвращает ID контакта или None если не найден.
        """
        result = self._call("crm.contact.list", {
            "filter": {"EMAIL": email},
            "select": ["ID", "EMAIL"],
        })
        items = result.get("result", [])
        return int(items[0]["ID"]) if items else None

    def create_contact(self, fields: dict) -> int | None:
        """
        Создаёт новый контакт в Битрикс24.
        Возвращает ID созданного контакта или None при ошибке.
        """
        result = self._call("crm.contact.add", {"fields": fields})
        contact_id = result.get("result")
        if contact_id:
            logger.info("Создан контакт в Битрикс24, ID: %s", contact_id)
            return int(contact_id)
        return None

    def update_contact(self, contact_id: int, fields: dict) -> bool:
        """
        Обновляет существующий контакт в Битрикс24.
        Возвращает True при успехе.
        """
        result = self._call("crm.contact.update", {
            "id": contact_id,
            "fields": fields,
        })
        success = result.get("result", False)
        if success:
            logger.info("Обновлён контакт в Битрикс24, ID: %s", contact_id)
        return bool(success)