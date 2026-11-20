# Desarrollo

Detalles de desarrollo que no hacen falta para levantar la aplicación con `make up`. El camino
principal está en el [README](../README.md).

## Modo nativo (sin Docker para la app)

Requisitos: PostgreSQL 17, Python 3.13 con [uv](https://docs.astral.sh/uv/) y Node 24.

1. Crea una base de datos `visitas` con usuario y contraseña `visitas` (o usa otros valores
   y ajusta `DATABASE_URL`). Por ejemplo, con Docker solo para Postgres:

   ```bash
   docker run -d --name visitas-pg -p 5432:5432 \
     -e POSTGRES_USER=visitas -e POSTGRES_PASSWORD=visitas -e POSTGRES_DB=visitas postgres:17
   ```

2. Configuración: Django lee `.env` de la raíz del repo, y las variables de entorno tienen
   prioridad sobre él. El `DATABASE_URL` de `.env.example` apunta al host `db` de Docker,
   así que en nativo hay que apuntarlo a `localhost`:

   ```bash
   cp .env.example .env
   export DATABASE_URL=postgres://visitas:visitas@localhost:5432/visitas
   ```

3. Backend (en `http://localhost:8000`):

   ```bash
   cd backend
   uv sync
   uv run python manage.py migrate && uv run python manage.py seed_demo && uv run python manage.py runserver
   ```

   `seed_demo` crea el superusuario `admin` / `admin` con las variables
   `DJANGO_SUPERUSER_*` de `.env`. Los tests se ejecutan con `uv run pytest`.

4. Frontend (en otra terminal, en `http://localhost:3000`):

   ```bash
   cd frontend
   npm install
   BACKEND_URL=http://localhost:8000 npm run dev
   ```

## Ver y ajustar los tests E2E

Por defecto Playwright corre sin ventana. Para ver los tests en el navegador:

```bash
make e2e-ver                          # navegador visible, 1400 ms entre acciones, un test cada vez
make e2e-ver E2E_SLOWMO=3000          # más lento
make e2e E2E_FLAGS=--ui               # interfaz de Playwright: eliges y repites tests paso a paso
make e2e E2E_FLAGS='--headed -g "create a valid visit"' E2E_SLOWMO=500   # solo la prueba cuyo título contiene "create a valid visit"
```

`E2E_FLAGS` pasa opciones a `playwright test` y `E2E_SLOWMO` fija la pausa en milisegundos
entre acciones (con pausa, el tiempo máximo por test sube a 3 minutos).

Los títulos de las pruebas están en inglés, tal como figuran en `frontend/e2e/*.spec.ts`; `-g` busca por
esos títulos. Para ejecutar solo una prueba del backend, con Docker:

```bash
docker compose run --rm backend uv run pytest -q -k test_create_rejects_future_date
```

Otros comandos: `make logs` sigue los logs, `make seed` carga los datos de demostración que
falten, `make lint` ejecuta `ruff check` y `ruff format --check` del backend (necesita `uv`) y
`make types` regenera `backend/schema.yml` y los tipos del frontend.
