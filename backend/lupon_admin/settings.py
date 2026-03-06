from pathlib import Path
from datetime import timedelta
import os
from urllib.parse import parse_qs, unquote, urlparse
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env", override=True)


SECRET_KEY = 'django-insecure-ie3yr$c5@0_ldii218p2l93@ypin7rml9h&v)vsi7*s)&#*d%g'

DEBUG = os.getenv("DEBUG", "False").strip().lower() == "true"

allowed_hosts = os.getenv("ALLOWED_HOSTS", "")
if allowed_hosts:
    ALLOWED_HOSTS = [host.strip() for host in allowed_hosts.split(",") if host.strip()]
else:
    ALLOWED_HOSTS = [
        "localhost",
        "127.0.0.1",
        "lupon-app-web-production.up.railway.app",
    ]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'core',
    'documentos',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'lupon_admin.urls'

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://192.168.1.42:5173",
    "http://192.168.1.92:5173",
    "http://localhost:5174",
    "http://192.168.1.42:5174",
    "http://192.168.1.92:5174",
    "https://adaptable-balance-production.up.railway.app",
]
cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
if cors_origins:
    CORS_ALLOWED_ORIGINS.extend(
        [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
    )
    CORS_ALLOWED_ORIGINS = list(dict.fromkeys(CORS_ALLOWED_ORIGINS))

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.up\.railway\.app$",
    r"^http://192\.168\.\d{1,3}\.\d{1,3}:517[34]$",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://192.168.1.42:5173",
    "http://192.168.1.92:5173",
    "http://localhost:5174",
    "http://192.168.1.42:5174",
    "http://192.168.1.92:5174",
    "https://adaptable-balance-production.up.railway.app",
]
csrf_origins = os.getenv("CSRF_TRUSTED_ORIGINS", "")
if csrf_origins:
    CSRF_TRUSTED_ORIGINS.extend(
        [origin.strip() for origin in csrf_origins.split(",") if origin.strip()]
    )
    CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(CSRF_TRUSTED_ORIGINS))

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
            ],
        },
    },
]

WSGI_APPLICATION = 'lupon_admin.wsgi.application'


def _database_config():
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        parsed = urlparse(database_url)
        options = {}
        query = parse_qs(parsed.query)
        if "sslmode" in query and query["sslmode"]:
            options["sslmode"] = query["sslmode"][-1]
        elif os.getenv("DB_SSLMODE"):
            options["sslmode"] = os.getenv("DB_SSLMODE")

        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": unquote(parsed.path.lstrip("/")),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname or "localhost",
            "PORT": int(parsed.port or 5432),
            "OPTIONS": options or {"sslmode": "prefer"},
        }

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "postgres"),
        "USER": os.getenv("DB_USER", "postgres"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": int(os.getenv("DB_PORT", "5432")),
        "OPTIONS": {
            "sslmode": os.getenv("DB_SSLMODE", "prefer"),
        },
    }


DATABASES = {"default": _database_config()}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}


AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'es'

TIME_ZONE = 'America/Argentina/Buenos_Aires'

USE_I18N = True

USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
