from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver
from .bitrix.sync import sync_user_to_bitrix
from .models import Profile

User = get_user_model()


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """
    Срабатывает когда создаётся новый пользователь.
    Отправляет его в Битрикс24 как новый контакт.
    """
    if created:
        sync_user_to_bitrix(instance)


@receiver(post_save, sender=Profile)
def profile_post_save(sender, instance, **kwargs):
    """
    Срабатывает когда пользователь обновляет профиль
    (меняет имя, возраст, bio).
    Обновляет контакт в Битрикс24.
    """
    sync_user_to_bitrix(instance.user)