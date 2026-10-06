.PHONY: help up down build test lint format migrate seed clean

# Default target
help:
	@echo "Inventario Papa - Comandos disponibles:"
	@echo ""
	@echo "  make up          - Levantar stack completo con Docker Compose"
	@echo "  make down        - Detener stack"
	@echo "  make build       - Construir imágenes Docker"
	@echo "  make test        - Ejecutar pruebas"
	@echo "  make lint        - Ejecutar linter (ruff)"
	@echo "  make format      - Formatear código (ruff format)"
	@echo "  make migrate     - Ejecutar migraciones Alembic"
	@echo "  make migrate-create NAME=xxx - Crear nueva migración"
	@echo "  make seed        - Cargar datos de prueba"
	@echo "  make clean       - Limpiar contenedores y volúmenes"
	@echo "  make shell       - Abrir shell en contenedor backend"

# Docker Compose
up:
	docker-compose up -d --build

down:
	docker-compose down

build:
	docker-compose build

# Testing
test:
	docker-compose exec backend pytest tests/ -v

test-cov:
	docker-compose exec backend pytest tests/ --cov=app --cov-report=html --cov-report=term

# Linting & Formatting
lint:
	docker-compose exec backend ruff check app/ tests/

format:
	docker-compose exec backend ruff format app/ tests/

# Migrations
migrate:
	docker-compose exec backend alembic upgrade head

migrate-create:
	docker-compose exec backend alembic revision --autogenerate -m "$(NAME)"

migrate-history:
	docker-compose exec backend alembic history

# Seed data
seed:
	docker-compose exec backend python scripts/seed.py

# Shell
shell:
	docker-compose exec backend bash

# Cleanup
clean:
	docker-compose down -v
	docker system prune -f

# Local development (without Docker)
local-install:
	pip install -e ".[dev]"

local-test:
	pytest tests/ -v

local-lint:
	ruff check app/ tests/

local-format:
	ruff format app/ tests/

local-migrate:
	alembic upgrade head

local-seed:
	python scripts/seed.py

local-shell:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000