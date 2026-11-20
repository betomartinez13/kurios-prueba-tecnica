# Registro de uso de IA

Este documento registra qué partes del proyecto fueron generadas con ayuda de IA (Claude), qué revisó el autor y qué se corrigió o rechazó. Cada tarea añade una entrada al terminar.

## Tarea 1 — Esqueleto del repo y del backend (2026-11-19)
- Generado por IA: estructura del backend (proyecto Django `config`, apps `common` y `visits`, `settings.py` por entorno, `pyproject.toml` con uv, pytest y ruff), `.env.example`, `.python-version`, `.nvmrc` y los tests de configuración.
- Revisado por el autor: pendiente
- Corregido o rechazado: ninguna

## Tarea 2 — Modelos, borrado lógico y admin (2026-11-19)
- Generado por IA: modelos abstractos `TimeStampedModel` y `SoftDeleteModel` (con manager y queryset), modelos `School`, `Teacher` y `Visit` con índices parciales, migración inicial, admin con filtro de estado y acción de restauración, factories y tests. También el fijado de `pytest-env` a una versión con más de dos semanas de antigüedad y la exclusión de migraciones en ruff.
- Revisado por el autor: pendiente
- Corregido o rechazado: ninguna

## Tarea 3 — Selectors y filtros (2026-11-19)
- Generado por IA: `VisitFilter` y `TeacherFilter` (django-filter), selectors de lectura (`visit_list`, `visit_get`, `school_list`, `teacher_list`) con error de validación por campo, y sus tests.
- Revisado por el autor: pendiente
- Corregido o rechazado: ninguna

## Tarea 4 — Servicios y reglas de negocio (2026-11-19)
- Generado por IA: `visits/services.py` (`visit_create`, `visit_update`, `visit_soft_delete` y `_validate_visit`) con las reglas de fecha, coherencia colegio-docente y observaciones, y sus tests, incluido el límite de zona horaria de Caracas.
- Revisado por el autor: pendiente
- Corregido o rechazado: ninguna

## Tarea 5 — API REST, manejador de errores y schema OpenAPI (2026-11-19)
- Generado por IA: serializers de entrada y salida con mensajes en español, `VisitViewSet`, `SchoolViewSet` y `TeacherViewSet`, rutas y documentación (`/api/schema/`, `/api/docs/`), el manejador de errores que traduce `ValidationError` de Django al formato de DRF, `backend/schema.yml` generado con drf-spectacular y los tests de la API.
- Revisado por el autor: pendiente
- Corregido o rechazado: ninguna
