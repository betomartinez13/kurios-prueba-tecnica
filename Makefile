.DEFAULT_GOAL := help
.PHONY: help up down reset logs test seed lint types e2e

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

e2e: ## Ejecuta las pruebas end-to-end
	@echo "pendiente (Tarea 14)"
