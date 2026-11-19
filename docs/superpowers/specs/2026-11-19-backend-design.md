# Registro de visitas — Diseño del backend

Complementa a [`2026-11-19-registro-visitas-design.md`](2026-11-19-registro-visitas-design.md) (el documento principal: qué se construye, modelo de datos, contrato de la API, flujos y casos borde). Este documento describe **cómo** se construye el backend.

## Detalles de implementación de la API

- `VisitViewSet` (`ViewSet` con las acciones `list`, `retrieve`, `create`, `update`,
  `partial_update` y `destroy`) **delega en la capa de servicios y selectors** (ver
  "Arquitectura", más abajo). No hereda de `ModelViewSet` porque la lógica de escritura
  no debe vivir en `perform_create`/`perform_update`. Colegios y docentes son
  `ReadOnlyModelViewSet` sencillos: no tienen lógica de negocio.
- `destroy` llama a `visit_soft_delete()` y nunca a `instance.delete()`.
- Permisos: `AllowAny` declarado **explícitamente** en settings de DRF, con un comentario
  de que la app no tiene autenticación por alcance. Se anota en el README como lo primero
  a añadir en una siguiente iteración.
- Esquema OpenAPI generado con `drf-spectacular` (`/api/schema/`) y Swagger UI en
  `/api/docs/`. Las vistas se anotan con `@extend_schema` (serializers de entrada y
  salida, filtros, respuestas 400/404) para que el schema sea exacto, porque de él se
  generan los tipos del frontend.
- Configuración por variables de entorno leídas con `django-environ` (`SECRET_KEY`,
  `DEBUG`, `DATABASE_URL`, `TIME_ZONE`, credenciales del superusuario de demo), con un
  `.env.example` versionado. Ningún secreto queda en `settings.py`.

## Paquetes

**Backend** (Python 3.12+, gestionado con **`uv`**, `pyproject.toml` + `uv.lock`; usuario)

| Paquete | Uso |
|---|---|
| `django` 5.x, `djangorestframework` | Framework y API |
| `django-filter` | `VisitFilter` para `school` y `visit_type` |
| `psycopg[binary]` 3 | Conector de PostgreSQL |
| `django-environ` | Configuración por `.env` y `DATABASE_URL` |
| `drf-spectacular` | Schema OpenAPI y Swagger UI; fuente de los tipos del frontend (usuario) |
| `pytest`, `pytest-django`, `factory-boy` | Tests y fábricas de datos de prueba |
| `ruff` (dev) | Revisión de estilo y formato |

Descartado: `django-model-utils`. El borrado lógico es lógica evaluada y cabe en unas
15 líneas propias y legibles.

## Arquitectura (patrones; usuario: services + selectors)

Sigue el **Django Styleguide de HackSoft**: la lógica de negocio no vive ni en vistas ni
en serializers.

```
backend/
  config/                 settings, urls, exception handler
  common/
    models.py             TimeStampedModel, SoftDeleteModel (abstractos)
  visits/
    models.py             School, Teacher, Visit + VisitQuerySet
    selectors.py          lecturas
    services.py           escrituras y reglas de negocio
    filters.py            VisitFilter (django-filter)
    serializers.py        Input/Output serializers
    apis.py               ViewSets: solo traducen HTTP ↔ servicios
    management/commands/seed_demo.py
    fixtures/             schools_teachers.json, sample_visits.json
    tests/                factories.py, test_services.py, test_selectors.py, test_apis.py
```

Patrones y responsabilidades:

- **Mixins de modelo abstractos** (`common/models.py`): `TimeStampedModel` (`created_at`,
  `updated_at`) y `SoftDeleteModel` (`is_deleted`, `deleted_at`, `soft_delete()`, y los
  managers `objects` = activos y `all_objects` = todos). `Visit` hereda de ambos.
- **Custom QuerySet** (`VisitQuerySet`): `.active()` y `.with_relations()`
  (`select_related("school", "teacher")`). Encapsula cómo se consulta, sin un Repository
  encima del ORM.
- **Selectors** (`selectors.py`), funciones puras de lectura:
  - `visit_list(*, filters: dict) -> QuerySet[Visit]`: aplica `VisitFilter` sobre
    `Visit.objects.active().with_relations()`, ordenado por fecha desc y luego
    `created_at` desc. Un filtro inválido lanza `ValidationError`.
  - `visit_get(*, visit_id: int) -> Visit`: lanza `Http404` si no existe o está eliminada.
  - `teacher_list(*, school_id: int | None)`, `school_list()`.
- **Services** (`services.py`): funciones con argumentos solo por nombre, envueltas en
  `@transaction.atomic`:
  - `visit_create(*, school, teacher, visit_date, visit_type, observations) -> Visit`
  - `visit_update(*, visit, data: dict) -> Visit`: aplica solo los campos recibidos;
    valida la coherencia colegio-docente **solo si cambian `school` o `teacher`**.
  - `visit_soft_delete(*, visit) -> None`
  - Las reglas de negocio viven aquí: fecha no futura y no anterior a 2000-01-01,
    coherencia colegio-docente y observaciones sin espacios sobrantes. Se aplican en un
    único helper privado `_validate_visit(...)` que usan crear y editar, y lanzan
    `django.core.exceptions.ValidationError({"campo": "mensaje"})`.
- **Serializers de entrada y salida** (`serializers.py`):
  - `VisitInputSerializer` (`serializers.Serializer`, no `ModelSerializer`): solo forma y
    tipos (campos requeridos, longitud máxima, `PrimaryKeyRelatedField` para colegio y
    docente, `ChoiceField` para el tipo). No contiene reglas de negocio.
  - `VisitOutputSerializer`: IDs más nombres legibles, `visit_type_label`, `created_at` y
    `updated_at`.
  - `SchoolSerializer` y `TeacherSerializer`, de solo lectura.
- **APIs** (`apis.py`): cada acción valida la entrada con el serializer de entrada, llama
  a un selector o servicio y responde con el serializer de salida. Nada más.
- **Exception handler propio** (`config/exceptions.py`): traduce el `ValidationError` de
  Django que lanzan los servicios al formato de DRF (`{campo: [mensajes]}`, 400). Así el
  frontend recibe un único formato de error venga de donde venga.
- **Command**: `seed_demo` (datos iniciales y superusuario de demo).
- **Factory**: `factory-boy` (`SchoolFactory`, `TeacherFactory`, `VisitFactory`) en los tests.

Lo que se descarta a propósito: un Repository sobre el ORM, inyección de dependencias,
clases de servicio con estado y señales de Django para la lógica de negocio.

## Datos iniciales

Dos fixtures JSON con datos ficticios:
- `schools_teachers.json`: unos 3 colegios y unos 8 docentes, con PKs fijas. Se carga en
  cada arranque del backend (`migrate` + `loaddata`), lo cual es idempotente.
- `sample_visits.json`: algunas visitas de ejemplo para que el listado no arranque vacío.
  **Decisión de Claude:** se carga **solo si la tabla de visitas está vacía**, incluidas
  las eliminadas lógicamente (`Visit.all_objects`). Si se recargara siempre, un reinicio
  "resucitaría" las visitas borradas o editadas por el evaluador y parecería que el borrado
  lógico no funciona.

La lógica de arranque vive en un comando de gestión propio (p. ej. `seed_demo`) que también
crea el superusuario de demo, para que Docker y el modo nativo usen el mismo paso.
