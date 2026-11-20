.DEFAULT_GOAL := help
.PHONY: help up down reset logs test seed lint types e2e

help: ## Muestra esta ayuda
	@grep -E '^[a-z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-8s %s\n", $$1, $$2}'

up: ## Levanta la aplicación (crea .env si falta)
	@test -f .env || cp .env.example .env
	docker compose up -d --build --wait

down: ## Detiene los contenedores
	docker compose down

reset: ## Detiene todo y borra la base de datos
	docker compose down -v

logs: ## Sigue los logs
	docker compose logs -f

test: ## Ejecuta los tests del backend en Docker
	@test -f .env || cp .env.example .env
	docker compose run --rm backend uv run pytest -q

seed: ## Carga los datos de demostración
	docker compose exec backend uv run python manage.py seed_demo

lint: ## Ruff check y format --check
	cd backend && uv run ruff check . && uv run ruff format --check .

types: ## Regenera los tipos del frontend
	@echo "pendiente (Tarea 9)"

e2e: ## Ejecuta las pruebas end-to-end
	@echo "pendiente (Tarea 14)"
