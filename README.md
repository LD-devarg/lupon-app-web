# Lupon Admin

Aplicación fullstack para administración de distribuidora: backend en Django REST Framework y frontend en React + Vite.

## Estructura
- `backend/`: API REST (Django + DRF).
- `frontend/`: SPA React (Vite, Tailwind, React Router).

## Requisitos
- Python 3.11+ (recomendado) y `pip`
- Node 18+ y npm
- PostgreSQL (DB remota o local)

## Backend
1. Crear y activar un virtualenv.
2. Instalar dependencias:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Configurar variables de entorno (no usar secretos en `settings.py` en producción):
   ```bash
   export DJANGO_SECRET_KEY="<tu_secret>"
   export DB_NAME="<db>"
   export DB_USER="<user>"
   export DB_PASSWORD="<pass>"
   export DB_HOST="<host>"
   export DB_PORT=5432
   ```
   Ajusta `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` según despliegue.
4. Migraciones y runserver:
   ```bash
   python backend/manage.py migrate
   python backend/manage.py runserver 0.0.0.0:8000
   ```

## Frontend
1. Instalar dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Levantar en dev (proxy a backend en `vite.config.js` -> `http://127.0.0.1:8000`):
   ```bash
   npm run dev
   ```
3. Build de producción:
   ```bash
   npm run build
   ```

## Endpoints y rutas
- API base: `http://localhost:8000/api/` (ver routers en `backend/core/urls.py`).
- Frontend rutas principales: `/` (home), `/cash`, `/contacts`, `/orders/new`, `/management`, `/sells`, `/products`, `/purchases`, `/orders`, `/profile`.

## Notas
- Mantener fuera de Git: `venv/`, `__pycache__/`, `*.pyc`, `node_modules/`, `dist/`, `.env` (ver `.gitignore`).
- Revisar `backend/lupon_admin/settings.py` para mover credenciales a variables de entorno antes de desplegar.
