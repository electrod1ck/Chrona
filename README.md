# Chrona

Веб-приложение по дизайн-спецификации в `docs/CHRONA_DESIGN_SPEC.md`: Django (API + сессии) и React (Vite) с UI в духе спеки.

## Быстрый старт

```text
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_chrona
cd frontend
npm install
npm run build
cd ..
python manage.py runserver
```

Сообщение **«This is a development server…»** при `runserver` — нормальное напоминание Django: такой сервер только для локальной разработки, его не используют в продакшене.

Откройте в браузере: `http://127.0.0.1:8000/`

- **Титульная страница** (`/`) — полноэкранное видео/постер и призыв зайти в приложение.
- **Приложение** (`/app`) — доступно **без входа** (гостевой режим: демо-дашборд, общая книга, пульс настроения, идеи, инсайты, демо-карта).
- **Регистрация** (`/register`) — новый пользователь в стандартной таблице Django `auth_user` + профиль Chrona.
- **Вход** (`/login`) — демо после `seed_chrona`: логин **demo**, пароль **demo**.

## Разработка фронтенда

В отдельном терминале:

```text
python manage.py runserver
cd frontend
npm run dev
```

Приложение: `http://127.0.0.1:5173/` (прокси на `/api` → порт 8000).

После изменений в React для прод-сборки снова выполните `npm run build` (артефакты попадают в `chrona/static/chrona/`).

### «Ничего не поменялось» в браузере

1. **Обязательно** снова: `cd frontend` → `npm run build` → перезапустите `python manage.py runserver`.
2. Сделайте **жёсткое обновление**: Ctrl+F5 или Ctrl+Shift+R (кэш часто держит старый `main.js`).
3. Титульная страница с видео — адрес **`/`** (корень сайта). Старое приложение теперь по адресу **`/app`**.
4. Если после сборки стили/скрипт всё ещё старые, в `chrona1/settings.py` увеличьте `CHRONA_ASSET_VERSION` (или задайте переменную окружения `CHRONA_ASSET_VERSION`) — к URL статики добавится новый `?v=…`.

## Админка

`http://127.0.0.1:8000/admin/` — создайте суперпользователя командой `python manage.py createsuperuser`.

## Продакшен (без предупреждения runserver)

1. Установите зависимости: `pip install -r requirements-production.txt`
2. Соберите фронт: `cd frontend && npm run build && cd ..`
3. Задайте переменные окружения (пример для PowerShell):

```text
$env:DJANGO_DEBUG="0"
$env:DJANGO_SECRET_KEY="сгенерируйте-длинную-случайную-строку"
$env:DJANGO_ALLOWED_HOSTS="ваш-домен.ru,www.ваш-домен.ru"
```

Добавьте в `CSRF_TRUSTED_ORIGINS` / `CORS_ALLOWED_ORIGINS` ваши HTTPS-оригины в `settings.py` или вынесите их в env по тому же принципу.

4. Соберите статику и запустите Gunicorn:

```text
python manage.py collectstatic --noinput
gunicorn chrona1.wsgi:application --bind 0.0.0.0:8000
```

Перед сервером обычно ставят **nginx** или другой reverse proxy (TLS, кэш, лимиты). Подробнее: [How to deploy Django](https://docs.djangoproject.com/en/stable/howto/deployment/).
