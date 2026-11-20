# Registro de uso de IA

Este documento registra qué partes del proyecto fueron generadas con ayuda de IA (Claude), qué revisó el autor y qué se corrigió o rechazó. Cada tarea añade una entrada al terminar.

## Tarea 1 — Esqueleto del repo y del backend (2026-11-19)
- Generado por IA: estructura del backend (proyecto Django `config`, apps `common` y `visits`, `settings.py` por entorno, `pyproject.toml` con uv, pytest y ruff), `.env.example`, `.python-version`, `.nvmrc` y los tests de configuración.
- Revisado por el autor: pendiente
- Corregido o rechazado: Detectado en la revisión automática de la tarea (no por el autor): la primera versión dejaba una `SECRET_KEY` por defecto en `settings.py`; se corrigió para que sea obligatoria por entorno (commit `fix: exige SECRET_KEY por entorno sin valor por defecto`).

## Tarea 2 — Modelos, borrado lógico y admin (2026-11-19)
- Generado por IA: modelos abstractos `TimeStampedModel` y `SoftDeleteModel` (con manager y queryset), modelos `School`, `Teacher` y `Visit` con índices parciales, migración inicial, admin con filtro de estado y acción de restauración, factories y tests. También el fijado de `pytest-env` a una versión con más de dos semanas de antigüedad y la exclusión de migraciones en ruff.
- Revisado por el autor: pendiente
- Corregido o rechazado: Detectado en la revisión automática de la tarea (no por el autor): `pytest-env` se había fijado en una versión publicada el mismo día; se cambió por una con más de dos semanas.

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

## Tarea 6 — Datos iniciales y comando `seed_demo` (2026-11-19)
- Generado por IA: fixtures de colegios, docentes y seis visitas de ejemplo (ficticias, con observaciones en español y fechas de octubre y noviembre de 2026), el comando `seed_demo` idempotente (las visitas solo se cargan si `Visit.all_objects` está vacío; el superusuario sale de las variables de entorno y se omite con aviso si faltan) y sus tests.
- Revisado por el autor: pendiente
- Corregido o rechazado: ninguna

## Tarea 7 — Docker del backend, compose y Makefile (2026-11-19)
- Generado por IA: `backend/Dockerfile` (python:3.13-slim, uv 0.13.9 fijado, entorno virtual en `/opt/venv`), `backend/.dockerignore`, `docker-compose.yml` (db `postgres:17` y backend con healthchecks y orden de arranque) y `Makefile` (`up`, `down`, `reset`, `logs`, `test`, `seed`, `lint`, y marcadores para `types` y `e2e`).
- Revisado por el autor: pendiente
- Corregido o rechazado: ninguna

## Tarea 8 — Esqueleto del frontend, estilos de Kurios y proxy (2026-11-19)
- Generado por IA: app Next.js con `create-next-app` (se usa 16.4.5, la última 16.x con más de dos semanas; 16.4.6 tenía diez días), dependencias fijadas a versiones exactas con más de dos semanas, tokens de Kurios (`styles/_tokens.scss`), mixins (`focus-ring`, `card`, `breakpoint`, `visually-hidden`), `globals.scss`, layout con Lexend, `Providers` (TanStack Query + nuqs), `NavBar` (con fallback en `Suspense` por `cacheComponents`), `Footer`, `Button`, `next.config.ts` con `skipTrailingSlashRedirect` y rewrites a Django, `Dockerfile`, servicio `frontend` en compose y el objetivo `.env` del `Makefile` para que `down`, `reset`, `logs`, `test` y `seed` funcionen en un clon limpio.
- Revisado por el autor: pendiente
- Corregido o rechazado: Detectado en la revisión automática de la tarea (no por el autor): el revisor pidió quitar la configurabilidad de `FRONTEND_PORT`; se rechazó porque el stack E2E aislado (puertos 3100/8100) la necesita.

## Tarea 9 — Contrato generado y cliente de API (2026-11-19)
- Generado por IA: objetivo `make types` (schema de drf-spectacular en Docker, `openapi-typescript` y prettier), `frontend/lib/api/schema.d.ts` generado, `types.ts` (alias de los tipos generados, sin tipos escritos a mano), `errors.ts` (`ApiError` y `normalizeError`) y `client.ts` (cliente `openapi-fetch` y funciones que lanzan `ApiError`).
- Revisado por el autor: pendiente
- Corregido o rechazado: ninguna

## Tarea 10 — Hooks de datos, formato de fechas y Playwright (2026-11-19)
- Generado por IA: claves de caché (`lib/queries/keys.ts`), hooks de TanStack Query para visitas y catálogos, `lib/format.ts` (fechas en es-VE leídas como fecha local y sin puntos en las abreviaturas), `lib/today.ts`, `playwright.config.ts`, `e2e/helpers.ts` y una prueba de humo (`e2e/smoke.spec.ts`) que crea y borra una visita por la API.
- Revisado por el autor: pendiente
- Corregido o rechazado: Detectado en la revisión automática de la tarea (no por el autor): "Registrada el…" mostraba también la hora; `formatDateTimeShort` se corrigió para devolver solo la fecha, como dice el spec (commit `fix: formatDateTimeShort devuelve solo la fecha local`).

## Tarea 11 — Pantalla de listado (2026-11-19)
- Generado por IA: `TypeBadge`, `VisitTable` (enlace estirado en la celda de la fecha, filas fantasma y apilado por debajo de 640 px), `VisitFilters`, `EmptyState`, `ErrorState`, `app/ListContainer.tsx` (filtros en la URL con nuqs, limpieza de valores inválidos, contador y estados) dentro de `Suspense` en `app/page.tsx`, y `e2e/list.spec.ts` (3 pruebas).
- Revisado por el autor: pendiente
- Corregido o rechazado: Detectado en la revisión automática de la tarea (no por el autor): dos E2E del listado podían pasar sin comprobar nada (un selector por prefijo ambiguo y el test de "un enlace por fila", que no lo verificaba); se reforzaron con aserciones exactas (commit `test: aserciones exactas en el E2E del listado`).

## Tarea 12 — Detalle, eliminar y "no encontrada" (2026-11-19)
- Generado por IA: `VisitDetail` (lista de definición, observaciones con `white-space: pre-line`, edición solo si difiere más de un minuto), `ConfirmDialog` (`<dialog>` nativo con `showModal`, foco inicial en Cancelar, Esc cierra), `NotFound`, `app/visitas/[id]/page.tsx` y `DetailContainer.tsx` (ID no numérico, `not_found`, volver con los filtros, eliminar con aviso y regreso al listado), tokens nuevos para el diálogo y `e2e/detail.spec.ts` (3 pruebas).
- Revisado por el autor: pendiente
- Corregido o rechazado: Detectado en la revisión automática de la tarea (no por el autor): un E2E del borrado, tal como venía en el plan, comprobaba un texto que el listado nunca muestra (aserción imposible de fallar); se reemplazó por la ausencia del enlace a la visita eliminada.

## Tarea 13 — Formulario de registrar y editar (2026-11-19)
- Generado por IA: `lib/forms/visitSchema.ts` (Zod como ayuda de UX, "hoy" calculado al validar, observaciones contadas por puntos de código como el backend, `toVisitInput`), `VisitForm` presentacional (selects de colegio y docente controlados, estados del docente, docente actual de una visita antigua, `max` de la fecha solo en el navegador, foco y centrado del primer error, errores del servidor por campo y aviso para los demás, contador, "Guardando…"), `app/visitas/nueva` y `app/visitas/[id]/editar` (los contenedores cargan colegios y docentes y se los pasan al formulario; 404 al cargar o al guardar muestra `NotFound`), tokens nuevos del formulario y `e2e/form.spec.ts` (6 pruebas; en la de visita eliminada se espera a que cargue el formulario antes de borrarla, para evitar una carrera).
- Revisado por el autor: pendiente
- Corregido o rechazado: Detectado en la revisión automática de la tarea (no por el autor): tres problemas: el test de "cambiar de colegio limpia el docente" pasaba aunque la lógica no existiera; un fallo al cargar docentes se mostraba como "no tiene docentes"; una recarga fallida en segundo plano borraba el formulario de edición. Se corrigieron en la entrada siguiente (corrección 1).

## Tarea 13 (corrección 1) — Formulario: docente, errores de carga y refetch (2026-11-19)
- Generado por IA: la limpieza del docente se decide con la lista ya cargada del colegio nuevo (así volver al colegio del docente lo conserva y `extraTeacher.school` solo decide en qué lista aparece), aviso "No se pudieron cargar los docentes." / "No se pudieron cargar los colegios." con "Reintentar" en vez de "Este colegio no tiene docentes registrados", envío bloqueado mientras cargan los docentes, la edición solo muestra error o NotFound al cargar si no hay datos (un refetch fallido no tira el formulario), y E2E: la prueba de cambio de colegio ahora vuelve al colegio original (antes pasaba aunque no se limpiara) y dos pruebas nuevas de errores de carga.
- Revisado por el autor: pendiente
- Corregido o rechazado: es la corrección de los tres problemas que detectó la revisión automática de la Tarea 13 (no el autor); el test de cambio de colegio se vio fallar en rojo antes del arreglo.


## Tarea 14 — E2E aislado, CI y pre-commit (2026-11-19)
- Generado por IA: `make e2e` (proyecto compose `e2e` en los puertos 3100/8100 con volumen propio, devuelve el código de salida de Playwright y siempre ejecuta `down -v`), `.github/workflows/ci.yml` (jobs `backend` y `frontend`, incluida la comprobación de que `schema.yml` y `schema.d.ts` están al día) y `.pre-commit-config.yaml` (ruff y ruff-format solo en `backend/`, prettier y eslint locales sobre `frontend/`).
- Revisado por el autor: pendiente
- Corregido o rechazado: ninguna

## Tarea 15 — Auditoría de interfaz, pasada exploratoria y README (2026-11-19)
- Generado por IA: auditoría con `web-design-guidelines` y sus ajustes (esqueletos de carga con `role="status"`, `viewport` con `colorScheme` y `themeColor`, `touch-action`, `text-wrap: balance`, cifras tabulares en las fechas, `overscroll-behavior` en el diálogo, `autocomplete="off"` en el formulario y `translate="no"` en la marca); pasada exploratoria con `webapp-testing` a 375 y 1440 px, que encontró que a 375 px el primer campo con error quedaba bajo la barra fija (`focusFirst` centraba el botón de enviar porque el foco de los campos con `Controller` llega después; se centra el campo por `name` y `html` tiene `scroll-padding-top`); `docs/screenshot-listado.png`; el manejador de errores manda un `ValidationError` sin campos a `non_field_errors` (con test); permisos de solo lectura y `concurrency` en la CI; `README.md` con el borrador de «Uso de inteligencia artificial».
- Revisado por el autor: pendiente
- Corregido o rechazado: detectado por la IA en la auditoría y en la pasada exploratoria (no por el autor): los ajustes de accesibilidad descritos arriba y el campo con error que quedaba bajo la barra fija a 375 px; también se aplicaron dos mejoras menores que la revisión automática había dejado pendientes (manejador de `ValidationError` sin campos y permisos/`concurrency` de la CI).
