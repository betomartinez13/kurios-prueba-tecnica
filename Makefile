.DEFAULT_GOAL := help
.PHONY: help up down reset logs test seed lint types e2e e2e-ver

# Opciones de Playwright para `make e2e`, p. ej. `make e2e E2E_FLAGS=--headed E2E_SLOWMO=500`.
E2E_FLAGS ?=
E2E_SLOWMO ?= 0

help: ## Muestra esta ayuda
	@grep -E '^[a-z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-8s %s\n", $$1, $$2}'

# Sin prerrequisitos: solo se crea si falta y nunca pisa un .env existente.
.env:
	cp .env.example .env

up: .env ## Levanta la aplicación (crea .env si falta)
	docker compose up -d --build --wait

down: .env ## Detiene los contenedores
	docker compose down

reset: .env ## Detiene todo y borra la base de datos
	docker compose down -v

logs: .env ## Sigue los logs
	docker compose logs -f

test: .env ## Ejecuta los tests del backend en Docker
	docker compose run --rm backend uv run pytest -q

seed: .env ## Carga los datos de demostración
	docker compose exec backend uv run python manage.py seed_demo

lint: ## Ruff check y format --check
	cd backend && uv run ruff check . && uv run ruff format --check .

types: ## Regenera los tipos del frontend
	docker compose run --rm --no-deps backend uv run python manage.py spectacular --file schema.yml --validate
	cd frontend && npx openapi-typescript ../backend/schema.yml -o lib/api/schema.d.ts
	cd frontend && npx prettier --write lib/api/schema.d.ts

# Proyecto compose "e2e" aparte (puertos 3100/8100 y volumen propio): no toca la demo.
# Devuelve el código de salida de Playwright y siempre desmonta, incluso si falla.
e2e: .env ## Ejecuta las pruebas end-to-end en un stack aislado
	@FRONTEND_PORT=3100 BACKEND_PORT=8100 docker compose -p e2e up -d --build --wait; \
	status=$$?; \
	if [ $$status -eq 0 ]; then \
		(cd frontend && E2E_BASE_URL=http://localhost:3100 E2E_SLOWMO=$(E2E_SLOWMO) npx playwright test $(E2E_FLAGS)); \
		status=$$?; \
	fi; \
	FRONTEND_PORT=3100 BACKEND_PORT=8100 docker compose -p e2e down -v; \
	exit $$status

e2e-ver: ## Igual que e2e, pero con el navegador visible, a cámara lenta y un test cada vez
	@$(MAKE) --no-print-directory e2e E2E_FLAGS="--headed --workers=1 $(E2E_FLAGS)" E2E_SLOWMO=$(if $(filter 0,$(E2E_SLOWMO)),1400,$(E2E_SLOWMO))
