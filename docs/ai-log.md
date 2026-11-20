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
