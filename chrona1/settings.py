"""
Django settings for chrona1 project.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Увеличьте после `npm run build`, чтобы браузер подтянул новый main.js/chrona.css
CHRONA_ASSET_VERSION = os.environ.get('CHRONA_ASSET_VERSION', '8')

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-1!h%y(20wvw-$rxt9lde0oje9wueycuna+p7*#76%5bb&quhf7',
)

DEBUG = os.environ.get('DJANGO_DEBUG', '1').lower() not in ('0', 'false', 'no')

_allowed = os.environ.get('DJANGO_ALLOWED_HOSTS', '').strip()
if _allowed:
    ALLOWED_HOSTS = [h.strip() for h in _allowed.split(',') if h.strip()]
else:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'chrona',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
]

if not DEBUG:
    MIDDLEWARE.append('whitenoise.middleware.WhiteNoiseMiddleware')

MIDDLEWARE += [
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'chrona1.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'chrona1.context_processors.chrona_assets',
            ],
        },
    },
]

WSGI_APPLICATION = 'chrona1.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'Europe/Moscow'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATICFILES_DIRS = []
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

if not DEBUG:
    STORAGES = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
        },
    }

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

CORS_ALLOWED_ORIGINS = [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
]

SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Production tweaks (keep DEBUG from environment; don't overwrite middleware)
# If running in production mode, ensure ALLOWED_HOSTS and whitenoise are set
if not DEBUG:
    # temporary permissive hosts for quick testing — tighten for production
    ALLOWED_HOSTS = ['*']

    # Ensure whitenoise is present without clobbering other middleware
    if 'whitenoise.middleware.WhiteNoiseMiddleware' not in MIDDLEWARE:
        MIDDLEWARE.insert(0, 'whitenoise.middleware.WhiteNoiseMiddleware')

# Database (Railway сам даст DATABASE_URL)
try:
    import dj_database_url

    DATABASES = {
        'default': dj_database_url.config(conn_max_age=600)
    }
except Exception:
    # dj-database-url is optional for local development; fall back to the
    # default sqlite DATABASES config defined earlier.
    DATABASES = DATABASES

# CSRF и cookies
CSRF_TRUSTED_ORIGINS = ['https://*.railway.app']


BITRIX_WEBHOOK_URL = "https://b24-til8k1.bitrix24.ru/rest/1/mpdzvah7teybvap8/"

# Системные коды кастомных полей (замени на свои из шага 1)
BITRIX_FIELD_AGE = "UF_CRM_1777630519"           # Возраст
BITRIX_FIELD_BIO = "UF_CRM_1777630584"           # О себе
BITRIX_FIELD_REGISTERED = "UF_CRM_1777630603"    # Дата регистрации
BITRIX_FIELD_MOMENTS = "UF_CRM_1777630624"       # Количество моментов
BITRIX_FIELD_RITUALS = "UF_CRM_1777630642"       # Активных ритуалов
