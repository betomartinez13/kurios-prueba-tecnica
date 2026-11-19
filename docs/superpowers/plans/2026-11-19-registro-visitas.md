# Registro de visitas a colegios — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la app de registro de visitas a colegios (crear, listar con filtros, ver, editar y borrado lógico), lista para que un evaluador de Kurios la levante con `make up`.

**Architecture:** Un repo con dos apps. `backend/` es Django 5.2 + DRF en capas (apis → services/selectors → models) sobre PostgreSQL 17. `frontend/` es Next.js con componentes de cliente que llaman a `/api/*`, y Next reenvía esas llamadas a Django. El contrato OpenAPI (`drf-spectacular`) genera los tipos TypeScript del frontend. Todo corre con docker-compose.

**Tech Stack:** Python 3.13, uv, Django 5.2 LTS, DRF, django-filter, drf-spectacular, django-environ, psycopg 3, pytest + pytest-django + factory-boy, ruff · Node 24 LTS, Next.js ≥ 16.3, React, TypeScript, SASS modules, TanStack Query, React Hook Form + Zod, openapi-typescript + openapi-fetch, nuqs, sonner, lucide-react, Playwright · PostgreSQL 17, Docker Compose, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-19-registro-visitas-design.md` (principal, manda), `docs/superpowers/specs/2026-11-19-backend-design.md`, `docs/superpowers/specs/2026-11-19-frontend-design.md`. Leer el principal más el del lado que toca cada tarea.

## Global Constraints

- Plazo: entrega el lunes 2026-11-23 a las 12:00. Si el tiempo aprieta, cortar según "Prioridades y líneas de corte" del spec principal (imprescindible → debería → podría).
- Versiones: Python 3.13 (`.python-version`), Node 24 LTS (`.nvmrc`), Django 5.2 LTS, PostgreSQL 17 (`postgres:17`), Next.js ≥ 16.3. Si 16.3 no existe al instalar, usar la última 16.x estable y anotarlo en la bitácora.
- UI y mensajes de la API en español, tuteando. Botones: "Registrar visita", "Guardar cambios", "Editar", "Eliminar visita", "Cancelar", "Reintentar", "Limpiar filtros". Avisos: "Visita registrada", "Cambios guardados", "Visita eliminada".
- Sin autenticación en la API: `DEFAULT_AUTHENTICATION_CLASSES = []`, `DEFAULT_PERMISSION_CLASSES = [AllowAny]`.
- Zona horaria: `TIME_ZONE` desde el entorno, por defecto `America/Caracas`; `USE_TZ = True`; `LANGUAGE_CODE = "es"`.
- Borrado lógico solo con `deleted_at` (`NULL` = activa). Ninguna ruta de la app ni de la API puede mostrar una visita eliminada.
- Las reglas de negocio viven solo en `visits/services.py`. Ni `apis.py` ni los serializers deciden reglas.
- Ningún tipo de la API se escribe a mano en el frontend: salen de `frontend/lib/api/schema.d.ts`, generado.
- Cada `app/**/page.tsx` es un Server Component que solo exporta `metadata` (título de pestaña, que la plantilla `"%s · Kurios"` completa: "Visitas", "Nueva visita", "Visita", "Editar visita") y renderiza un contenedor de cliente de la misma carpeta (`ListContainer.tsx`, `NewVisitContainer.tsx`, `DetailContainer.tsx`, `EditContainer.tsx`, con `"use client"`). Los contenedores componen los hooks; los componentes de `components/` no piden datos.
- Estilos: SASS modules + variables CSS de `styles/_tokens.scss`; ningún color ni medida escritos directamente en un componente. Sin Tailwind ni librerías de componentes.
- Commits convencionales en español y en presente (`feat: añadir servicio de borrado lógico`), con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Bitácora de IA:** cada tarea termina añadiendo una entrada a `docs/ai-log.md` con este formato, y la entrada va en el mismo commit que la tarea:
  ```
  ## Tarea N — <título> (AAAA-MM-DD)
  - Generado por IA: <qué escribió Claude>
  - Revisado por el autor: <qué revisó el usuario; "pendiente" si aún no lo vio>
  - Corregido o rechazado: <solo correcciones reales que pidió el usuario o que se detectaron en la revisión; "ninguna" si no hubo>
  ```
  Nunca se inventan revisiones ni correcciones del autor.

## Review Focus

1. **Sesión del admin abierta en el mismo navegador.** Iniciar sesión en `:8000/admin` y luego crear, editar y eliminar desde la app debe seguir funcionando. Test: `test_post_with_admin_session_cookie_succeeds` (Tarea 5).
2. **Límite de "hoy" entre zonas horarias.** A las 22:00 de Caracas del 19/11 ya es 20/11 en UTC: la fecha 2026-11-20 debe rechazarse y la del 19/11 aceptarse. Test: `test_today_uses_caracas_timezone` (Tarea 4).
3. **Barras finales a través del proxy de Next.** Next redirige por defecto `/api/visits/` a `/api/visits` (308) y Django, con `APPEND_SLASH`, no acepta un POST sin barra final. Las peticiones deben llegar intactas. Verificación con `curl` (Tarea 8) y E2E de creación (Tarea 13).
4. **Editar una visita que otra pestaña acaba de eliminar.** Al guardar, la API responde 404 y la app debe mostrar "Esta visita no existe o fue eliminada.", nunca un error genérico. E2E: `editing a deleted visit shows not found` (Tarea 13).
5. **Observaciones con saltos de línea, tildes y emojis.** Deben llegar intactas de la API al detalle, con los saltos de línea visibles. Test: `test_observations_roundtrip_preserves_newlines_and_unicode` (Tarea 5) y E2E en el flujo de creación (Tarea 13).

---

## Mapa de archivos

```
.gitignore · .python-version · .nvmrc · .env.example · Makefile · docker-compose.yml
.pre-commit-config.yaml · .github/workflows/ci.yml · README.md · docs/ai-log.md
backend/
  pyproject.toml · uv.lock · Dockerfile · manage.py · schema.yml (generado)
  config/settings.py · urls.py · exceptions.py · wsgi.py
  common/models.py                    TimeStampedModel, SoftDeleteQuerySet, SoftDeleteManager, SoftDeleteModel
  visits/models.py · admin.py · filters.py · selectors.py · services.py · serializers.py · apis.py · urls.py
  visits/management/commands/seed_demo.py
  visits/fixtures/schools_teachers.json · sample_visits.json
  visits/tests/factories.py · test_models.py · test_selectors.py · test_services.py · test_apis.py · test_seed.py
frontend/
  package.json · next.config.ts · tsconfig.json · Dockerfile · playwright.config.ts · .prettierrc
  public/kurios-k.png
  app/layout.tsx · providers.tsx · page.tsx · visitas/nueva/page.tsx · visitas/[id]/page.tsx · visitas/[id]/editar/page.tsx
  components/<Nombre>/<Nombre>.tsx + <Nombre>.module.scss
    NavBar, Footer, Button, TypeBadge, VisitTable, VisitFilters, EmptyState, ErrorState,
    VisitForm, VisitDetail, ConfirmDialog, NotFound
  lib/api/schema.d.ts (generado) · types.ts · client.ts · errors.ts
  lib/queries/keys.ts · visits.ts · catalog.ts
  lib/forms/visitSchema.ts · lib/format.ts · lib/today.ts
  styles/_tokens.scss · _mixins.scss · globals.scss
  e2e/helpers.ts · list.spec.ts · detail.spec.ts · form.spec.ts
```

---

### Task 1: Esqueleto del repo y del backend

**Files:**
- Create: `.gitignore` (añadir a lo existente), `.python-version` (`3.13`), `.nvmrc` (`24`), `.env.example`, `docs/ai-log.md`
- Create: `backend/pyproject.toml`, `backend/manage.py`, `backend/config/{__init__,settings,urls,wsgi}.py`, `backend/common/__init__.py`, `backend/visits/__init__.py`, `backend/visits/apps.py`, `backend/conftest.py`
- Test: `backend/config/tests/test_settings.py`

**Interfaces:**
- Produces: proyecto Django `config` con las apps `common` y `visits` instaladas; variables de entorno `SECRET_KEY`, `DEBUG`, `DATABASE_URL`, `TIME_ZONE`, `ALLOWED_HOSTS`, `DJANGO_SUPERUSER_USERNAME`, `DJANGO_SUPERUSER_PASSWORD`, `DJANGO_SUPERUSER_EMAIL`; `pytest` configurado con `DJANGO_SETTINGS_MODULE=config.settings`.

- [ ] **Step 1: Crear `backend/` con uv.** Ejecutar `uv init --app --python 3.13` y `uv add "django>=5.2,<5.3" djangorestframework django-filter drf-spectacular django-environ "psycopg[binary]>=3.2"`, y luego `uv add --dev pytest pytest-django factory-boy ruff`. En `pyproject.toml`: `[tool.pytest.ini_options] DJANGO_SETTINGS_MODULE = "config.settings"`, `python_files = ["test_*.py"]`; `[tool.ruff] line-length = 100`, `target-version = "py313"`, `lint.select = ["E","F","I","UP","B","DJ"]`.

- [ ] **Step 2: Escribir el test que falla** en `backend/config/tests/test_settings.py`:

```python
from django.conf import settings

def test_api_has_no_authentication_and_allows_any():
    rf = settings.REST_FRAMEWORK
    assert rf["DEFAULT_AUTHENTICATION_CLASSES"] == []
    assert rf["DEFAULT_PERMISSION_CLASSES"] == ["rest_framework.permissions.AllowAny"]
    assert rf["EXCEPTION_HANDLER"] == "config.exceptions.exception_handler"

def test_locale_and_timezone_defaults():
    assert settings.LANGUAGE_CODE == "es"
    assert settings.TIME_ZONE == "America/Caracas"
    assert settings.USE_TZ is True

def test_allowed_hosts_include_proxy_host():
    assert {"localhost", "127.0.0.1", "backend"} <= set(settings.ALLOWED_HOSTS)
```

- [ ] **Step 3: Ejecutar y verificar que falla.** Run: `cd backend && uv run pytest config/tests -q`. Expected: FAIL (no existe `config.settings`).

- [ ] **Step 4: Implementar `config/settings.py`** con `environ.Env`. Valores por defecto: `DEBUG=False`, `ALLOWED_HOSTS=["localhost","127.0.0.1","backend"]`, `TIME_ZONE="America/Caracas"`, `DATABASE_URL="postgres://visitas:visitas@localhost:5432/visitas"`. Settings fijos:
  - `INSTALLED_APPS`: `django.contrib.{admin,auth,contenttypes,sessions,messages,staticfiles}`, `rest_framework`, `django_filters`, `drf_spectacular`, `common`, `visits`.
  - `REST_FRAMEWORK`: `DEFAULT_AUTHENTICATION_CLASSES: []`, `DEFAULT_PERMISSION_CLASSES: ["rest_framework.permissions.AllowAny"]`, `DEFAULT_SCHEMA_CLASS: "drf_spectacular.openapi.AutoSchema"`, `EXCEPTION_HANDLER: "config.exceptions.exception_handler"`, `UNAUTHENTICATED_USER: None`. Comentario encima que explique las dos razones (sin autenticación por alcance; sin clases de autenticación para que la cookie de sesión del admin no active el CSRF de DRF).
  - `SPECTACULAR_SETTINGS`: `TITLE "Registro de visitas API"`, `VERSION "1.0.0"`, `COMPONENT_SPLIT_REQUEST: True`, `SERVE_INCLUDE_SCHEMA: False`.
  - `LANGUAGE_CODE="es"`, `USE_I18N=True`, `USE_TZ=True`, `STATIC_URL="static/"`.
  Crear `config/exceptions.py` con un `exception_handler(exc, context)` provisional que delega en el de DRF (la Tarea 5 lo completa). En `config/urls.py` solo `admin/` por ahora.

- [ ] **Step 5: Escribir `.env.example`** con `SECRET_KEY=cambia-esto-en-produccion`, `DEBUG=True`, `DATABASE_URL=postgres://visitas:visitas@db:5432/visitas`, `TIME_ZONE=America/Caracas`, `ALLOWED_HOSTS=localhost,127.0.0.1,backend`, `DJANGO_SUPERUSER_USERNAME=admin`, `DJANGO_SUPERUSER_PASSWORD=admin`, `DJANGO_SUPERUSER_EMAIL=admin@example.com`, `POSTGRES_USER=visitas`, `POSTGRES_PASSWORD=visitas`, `POSTGRES_DB=visitas`. Añadir a `.gitignore`: `.env`, `__pycache__/`, `.venv/`, `node_modules/`, `.next/`, `playwright-report/`, `test-results/`.

- [ ] **Step 6: Levantar un Postgres temporal para los tests y ejecutarlos.** Run: `docker run -d --name visitas-pg -e POSTGRES_USER=visitas -e POSTGRES_PASSWORD=visitas -e POSTGRES_DB=visitas -p 5432:5432 postgres:17`, luego `cd backend && uv run pytest config/tests -q`. Expected: `3 passed`. (Desde la Tarea 7 los tests corren con `make test`.)

- [ ] **Step 7: Crear `docs/ai-log.md`** con un título y un párrafo que explique su propósito, más la entrada de la Tarea 1.

- [ ] **Step 8: Commit.** `git add -A && git commit -m "chore: esqueleto del backend con Django 5.2, DRF y configuración por entorno"`

---

### Task 2: Modelos, borrado lógico y admin

**Files:**
- Create: `backend/common/models.py`, `backend/visits/models.py`, `backend/visits/admin.py`, `backend/visits/migrations/0001_initial.py` (con `makemigrations`)
- Test: `backend/visits/tests/__init__.py`, `backend/visits/tests/factories.py`, `backend/visits/tests/test_models.py`

**Interfaces:**
- Produces:
  - `common.models.TimeStampedModel` (abstracto): `created_at = DateTimeField(auto_now_add=True)`, `updated_at = DateTimeField(auto_now=True)`.
  - `common.models.SoftDeleteQuerySet(QuerySet)`: `.active()` filtra `deleted_at__isnull=True`.
  - `common.models.SoftDeleteManager(Manager)`: `get_queryset()` devuelve solo las activas.
  - `common.models.SoftDeleteModel` (abstracto): `deleted_at = DateTimeField(null=True, blank=True, db_index=False)`, propiedad `is_deleted -> bool`, `soft_delete() -> None` (pone `timezone.now()` y guarda solo `deleted_at`), `restore() -> None` (pone `None`).
  - `visits.models.School(name: CharField(150, unique))`, `Teacher(first_name, last_name: CharField(100), school: FK PROTECT related_name="teachers")` con la propiedad `full_name` y `Meta.ordering = ["last_name","first_name"]`.
  - `visits.models.VisitQuerySet(SoftDeleteQuerySet)`: `.with_relations()` = `select_related("school","teacher")`.
  - `visits.models.Visit(TimeStampedModel, SoftDeleteModel)`: `school` FK PROTECT, `teacher` FK PROTECT, `visit_date: DateField`, `visit_type: CharField(20, choices=Visit.Type)`, `observations: TextField`. `Visit.Type(TextChoices)`: `CLASSROOM = "CLASSROOM", "Visita en aula"` y `MEETING = "MEETING", "Encuentro"`. Managers: `objects = SoftDeleteManager.from_queryset(VisitQuerySet)()` y `all_objects = VisitQuerySet.as_manager()`.
  - Índices parciales en `Visit.Meta.indexes`: `Index(fields=["-visit_date","-created_at"], name="visit_active_date_idx", condition=Q(deleted_at__isnull=True))` e `Index(fields=["school","visit_type"], name="visit_active_filter_idx", condition=Q(deleted_at__isnull=True))`.
  - Factories: `SchoolFactory`, `TeacherFactory` (con su `school` por SubFactory), `VisitFactory` (`teacher` por SubFactory y `school = factory.SelfAttribute("teacher.school")`, `visit_date` = hoy menos 1 día, `visit_type = CLASSROOM`, `observations` con texto).
  - `__str__`: School → nombre; Teacher → nombre completo; Visit → `"<fecha> · <docente> (<colegio>)"`.

- [ ] **Step 1: Escribir los tests que fallan** en `test_models.py` (`pytestmark = pytest.mark.django_db`):

```python
def test_soft_delete_hides_visit_from_default_manager_but_keeps_row():
    visit = VisitFactory()
    visit.soft_delete()
    assert visit.is_deleted is True
    assert not Visit.objects.filter(pk=visit.pk).exists()
    assert Visit.all_objects.filter(pk=visit.pk, deleted_at__isnull=False).exists()

def test_restore_brings_visit_back():
    visit = VisitFactory(); visit.soft_delete(); visit.restore()
    assert Visit.objects.filter(pk=visit.pk).exists()
    assert visit.is_deleted is False

def test_active_and_with_relations_are_chainable():
    VisitFactory(); VisitFactory().soft_delete()
    assert Visit.objects.active().with_relations().count() == 1
    assert Visit.all_objects.active().count() == 1

def test_partial_indexes_exist():
    names = {i.name for i in Visit._meta.indexes}
    assert {"visit_active_date_idx", "visit_active_filter_idx"} <= names
    assert all(i.condition is not None for i in Visit._meta.indexes)
```

- [ ] **Step 2: Ejecutar y verificar que fallan.** Run: `uv run pytest visits/tests/test_models.py -q`. Expected: FAIL (ImportError).
- [ ] **Step 3: Implementar los modelos y las factories** según el bloque Interfaces y generar la migración con `uv run python manage.py makemigrations common visits`.
- [ ] **Step 4: Implementar `visits/admin.py`.** Registrar `School` y `Teacher` (búsqueda por nombre; `list_filter=["school"]` en Teacher). En `VisitAdmin`: `get_queryset` devuelve `Visit.all_objects.with_relations()`; `list_display = ["visit_date","school","teacher","visit_type","is_deleted_display"]`; `is_deleted_display` con `@admin.display(boolean=True, description="Eliminada")`; un `SimpleListFilter` llamado "Estado" con las opciones `activas` / `eliminadas`; la acción `restore_visits` con descripción "Restaurar visitas seleccionadas", que llama a `restore()` en cada una y muestra un mensaje con el número restaurado.
- [ ] **Step 5: Añadir un test de la acción del admin** en `test_models.py`: `test_admin_restore_action_restores_selected` (invocar `VisitAdmin(Visit, admin.site).restore_visits(request, Visit.all_objects.filter(pk=v.pk))` con un `RequestFactory` y mensajes simulados, y luego comprobar que `Visit.objects.filter(pk=v.pk).exists()`).
- [ ] **Step 6: Ejecutar.** Run: `uv run pytest visits/tests/test_models.py -q`. Expected: `5 passed`.
- [ ] **Step 7: Bitácora + commit.** `git commit -m "feat: modelos de colegio, docente y visita con borrado lógico e índices parciales"`

---

### Task 3: Selectors y filtros

**Files:**
- Create: `backend/visits/filters.py`, `backend/visits/selectors.py`
- Test: `backend/visits/tests/test_selectors.py`

**Interfaces:**
- Consumes: modelos y factories de la Tarea 2.
- Produces:
  - `VisitFilter(django_filters.FilterSet)`: `school = ModelChoiceFilter(queryset=School.objects.all())`, `visit_type = ChoiceFilter(choices=Visit.Type.choices)`.
  - `TeacherFilter(FilterSet)`: `school = ModelChoiceFilter(queryset=School.objects.all())`.
  - `visit_list(*, filters: Mapping[str, str]) -> QuerySet[Visit]`: aplica el filtro sobre `Visit.objects.active().with_relations()` y ordena por `-visit_date`, `-created_at`. Si el filtro no es válido, lanza `django.core.exceptions.ValidationError(filterset.errors)` (con forma de diccionario por campo).
  - `visit_get(*, visit_id: int) -> Visit`: `get_object_or_404(Visit.objects.with_relations(), pk=visit_id)`.
  - `school_list() -> QuerySet[School]`, ordenado por nombre.
  - `teacher_list(*, filters: Mapping[str, str]) -> QuerySet[Teacher]`, con `select_related("school")` y la misma regla de error que `visit_list`.

- [ ] **Step 1: Escribir los tests que fallan:**

```python
def test_visit_list_excludes_deleted_and_orders_by_date_then_created(): ...
    # v_old(date=hoy-5), v_new(date=hoy-1), v_same_day_later(date=hoy-1, creada después), v_del borrada
    # assert list(visit_list(filters={})) == [v_same_day_later, v_new, v_old]
def test_visit_list_filters_combine_with_and(): ...
    # school A + MEETING → solo la visita que cumple ambas
def test_visit_list_invalid_filter_raises_validation_error():
    with pytest.raises(ValidationError) as e:
        visit_list(filters={"visit_type": "XYZ"})
    assert "visit_type" in e.value.message_dict
    with pytest.raises(ValidationError):
        visit_list(filters={"school": "abc"})
def test_visit_get_404_for_deleted_or_missing():
    v = VisitFactory(); v.soft_delete()
    with pytest.raises(Http404): visit_get(visit_id=v.pk)
    with pytest.raises(Http404): visit_get(visit_id=999999)
def test_teacher_list_filters_by_school(): ...
```

- [ ] **Step 2: Ejecutar y verificar que fallan.** Run: `uv run pytest visits/tests/test_selectors.py -q`. Expected: FAIL.
- [ ] **Step 3: Implementar `filters.py` y `selectors.py`** según Interfaces.
- [ ] **Step 4: Ejecutar.** Expected: `5 passed`.
- [ ] **Step 5: Bitácora + commit.** `git commit -m "feat: selectors de visitas, colegios y docentes con filtros"`

---

### Task 4: Servicios y reglas de negocio

**Files:**
- Create: `backend/visits/services.py`
- Test: `backend/visits/tests/test_services.py`

**Interfaces:**
- Consumes: modelos de la Tarea 2.
- Produces (todas las funciones con `@transaction.atomic` y argumentos solo por nombre; los errores son `django.core.exceptions.ValidationError({campo: mensaje})`):
  - `visit_create(*, school: School, teacher: Teacher, visit_date: date, visit_type: str, observations: str) -> Visit`
  - `visit_update(*, visit: Visit, data: dict) -> Visit`: aplica solo las claves presentes en `data` (`school`, `teacher`, `visit_date`, `visit_type`, `observations`). La coherencia entre colegio y docente se comprueba solo si `data["school"] != visit.school` o `data["teacher"] != visit.teacher`, comparando con lo guardado antes de aplicar.
  - `visit_soft_delete(*, visit: Visit) -> None`
  - `_validate_visit(*, school, teacher, visit_date, observations, check_school_teacher: bool) -> str`: devuelve las observaciones sin espacios al inicio ni al final. Junta todos los errores en un único `ValidationError`.
- Mensajes exactos:
  - `visit_date` futura: `"La fecha de la visita no puede ser posterior a hoy."`
  - `visit_date` anterior a 2000-01-01: `"Revisa la fecha: parece demasiado antigua."`
  - `teacher` de otro colegio: `"Este docente no pertenece al colegio seleccionado."`
  - `observations` vacías tras quitar los espacios: `"Escribe las observaciones de la visita."`
- "Hoy" es `timezone.localdate()`.

- [ ] **Step 1: Escribir los tests que fallan:**

```python
def test_create_accepts_today_and_strips_observations():
    t = TeacherFactory()
    v = visit_create(school=t.school, teacher=t, visit_date=timezone.localdate(),
                     visit_type=Visit.Type.CLASSROOM, observations="  Bien.\nSigue así.  ")
    assert v.observations == "Bien.\nSigue así."

def test_create_rejects_future_date(): ...          # message_dict["visit_date"] == ["La fecha de la visita no puede ser posterior a hoy."]
def test_create_rejects_date_before_2000(): ...     # date(1999,12,31) → "Revisa la fecha: parece demasiado antigua."; date(2000,1,1) aceptada
def test_create_rejects_teacher_from_other_school(): ...  # message_dict["teacher"] == ["Este docente no pertenece al colegio seleccionado."]
def test_create_rejects_blank_observations(): ...   # "   " → message_dict["observations"]
def test_today_uses_caracas_timezone():
    # 2026-11-20 02:00 UTC == 2026-11-19 22:00 en Caracas
    fixed = datetime(2026, 11, 20, 2, 0, tzinfo=UTC)
    with mock.patch("django.utils.timezone.now", return_value=fixed):
        t = TeacherFactory()
        visit_create(school=t.school, teacher=t, visit_date=date(2026, 11, 19),
                     visit_type="MEETING", observations="ok")
        with pytest.raises(ValidationError):
            visit_create(school=t.school, teacher=t, visit_date=date(2026, 11, 20),
                         visit_type="MEETING", observations="ok")

def test_update_old_visit_after_teacher_changed_school_saves_when_only_observations_change():
    v = VisitFactory(); new_school = SchoolFactory()
    Teacher.objects.filter(pk=v.teacher_id).update(school=new_school)
    v.refresh_from_db()
    updated = visit_update(visit=v, data={"school": v.school, "teacher": v.teacher,
                           "visit_date": v.visit_date, "visit_type": v.visit_type,
                           "observations": "Corregido"})
    assert updated.observations == "Corregido"

def test_update_changing_teacher_to_other_school_is_rejected(): ...
def test_soft_delete_service_sets_deleted_at(): ...
```

- [ ] **Step 2: Ejecutar y verificar que fallan.** Run: `uv run pytest visits/tests/test_services.py -q`. Expected: FAIL.
- [ ] **Step 3: Implementar `services.py`** según Interfaces.
- [ ] **Step 4: Ejecutar.** Expected: `9 passed`.
- [ ] **Step 5: Bitácora + commit.** `git commit -m "feat: servicios de visitas con reglas de fecha, coherencia y observaciones"`

---

### Task 5: API REST, manejador de errores y schema OpenAPI

**Files:**
- Create: `backend/visits/serializers.py`, `backend/visits/apis.py`, `backend/visits/urls.py`
- Modify: `backend/config/exceptions.py`, `backend/config/urls.py`
- Test: `backend/visits/tests/test_apis.py`

**Interfaces:**
- Consumes: selectors (Tarea 3) y servicios (Tarea 4).
- Produces:
  - `VisitInputSerializer(serializers.Serializer)` con mensajes en español:
    - `school = PrimaryKeyRelatedField(queryset=School.objects.all())`. `required`/`null` → `"Elige un colegio."`; `does_not_exist` → `"El colegio seleccionado no existe."`.
    - `teacher = PrimaryKeyRelatedField(queryset=Teacher.objects.all())`. `required`/`null` → `"Elige el docente visitado."`; `does_not_exist` → `"El docente seleccionado no existe."`.
    - `visit_date = DateField()`. `required`/`null`/`invalid` → `"Indica la fecha de la visita."`.
    - `visit_type = ChoiceField(choices=Visit.Type.choices)`. `required` → `"Elige un tipo de visita."`; `invalid_choice` → `"Elige un tipo de visita válido."`.
    - `observations = CharField(max_length=5000)`. `required`/`blank` → `"Escribe las observaciones de la visita."`; `max_length` → `"Máximo 5000 caracteres."`.
  - `VisitOutputSerializer`: `id, school, school_name, teacher, teacher_name, visit_date, visit_type, visit_type_label, observations, created_at, updated_at`.
  - `SchoolSerializer` (`id, name`) y `TeacherSerializer` (`id, first_name, last_name, full_name, school`).
  - `VisitViewSet(viewsets.ViewSet)` con `lookup_value_regex = r"\d+"` y las acciones `list`, `retrieve`, `create` (201), `update` (PUT, completo), `partial_update` (PATCH, `partial=True`) y `destroy` (204). `SchoolViewSet` y `TeacherViewSet` (`ReadOnlyModelViewSet` que obtienen su queryset de los selectors; `teachers` acepta `?school=`).
  - Rutas: `DefaultRouter(trailing_slash=True)` en `/api/` con `schools`, `teachers` y `visits`; `/api/schema/` (`SpectacularAPIView`) y `/api/docs/` (`SpectacularSwaggerView`).
  - `config.exceptions.exception_handler`: convierte un `django.core.exceptions.ValidationError` en `rest_framework.exceptions.ValidationError(detail=exc.message_dict)` y luego llama al de DRF.
  - Cada acción lleva `@extend_schema` con el `request` de entrada, la `response` de salida y las respuestas 400/404; `list` declara los parámetros `school` (int) y `visit_type` (enum).

- [ ] **Step 1: Escribir los tests que fallan** con `APIClient`:

```python
def test_create_returns_201_with_readable_names(api, teacher): ...  # school_name, teacher_name, visit_type_label == "Visita en aula"
def test_list_filters_and_hides_deleted(api): ...
def test_list_invalid_filter_returns_400(api):
    assert api.get("/api/visits/?visit_type=XYZ").status_code == 400
    assert api.get("/api/visits/?school=abc").status_code == 400
def test_retrieve_update_delete_deleted_visit_return_404(api): ...  # GET, PUT, PATCH, DELETE → 404 tras borrar
def test_delete_returns_204_and_keeps_row(api): ...
def test_service_errors_use_drf_field_format(api):
    r = api.post("/api/visits/", {..., "visit_date": "2999-01-01"}, format="json")
    assert r.status_code == 400
    assert r.json()["visit_date"] == ["La fecha de la visita no puede ser posterior a hoy."]
def test_required_fields_messages_in_spanish(api):
    r = api.post("/api/visits/", {}, format="json")
    assert r.json()["school"] == ["Elige un colegio."]
    assert r.json()["observations"] == ["Escribe las observaciones de la visita."]
def test_post_with_admin_session_cookie_succeeds(admin_user, teacher):
    # navegador con la sesión del admin y sin token CSRF
    c = Client(enforce_csrf_checks=True); c.force_login(admin_user)
    r = c.post("/api/visits/", data=payload(teacher), content_type="application/json")
    assert r.status_code == 201
def test_observations_roundtrip_preserves_newlines_and_unicode(api, teacher):
    text = "Línea 1 — señal ñ\nLínea 2 🚀"
    vid = api.post("/api/visits/", payload(teacher, observations=text), format="json").json()["id"]
    assert api.get(f"/api/visits/{vid}/").json()["observations"] == text
def test_teachers_filter_by_school(api): ...
def test_schema_endpoint_returns_openapi(api):
    assert api.get("/api/schema/").status_code == 200
```

- [ ] **Step 2: Ejecutar y verificar que fallan.** Run: `uv run pytest visits/tests/test_apis.py -q`. Expected: FAIL (404 en las rutas).
- [ ] **Step 3: Implementar los serializers, el manejador de errores, los ViewSets y las rutas** según Interfaces.
- [ ] **Step 4: Ejecutar toda la suite.** Run: `uv run pytest -q`. Expected: todo pasa.
- [ ] **Step 5: Generar y versionar el schema.** Run: `uv run python manage.py spectacular --file schema.yml --validate`. Expected: termina sin avisos y `schema.yml` contiene los componentes `VisitInputRequest` y `VisitOutput`.
- [ ] **Step 6: Bitácora + commit.** `git commit -m "feat: API REST de visitas con schema OpenAPI y errores en español"`

---

### Task 6: Datos iniciales y comando `seed_demo`

**Files:**
- Create: `backend/visits/fixtures/schools_teachers.json`, `backend/visits/fixtures/sample_visits.json`, `backend/visits/management/__init__.py`, `backend/visits/management/commands/__init__.py`, `backend/visits/management/commands/seed_demo.py`
- Test: `backend/visits/tests/test_seed.py`

**Interfaces:**
- Produces (las Tareas 11 a 13 dependen de estos IDs):
  - Colegios: `1` "U.E. Los Samanes", `2` "Colegio El Ávila", `3` "U.E. Monte Claro".
  - Docentes: colegio 1 → `1` Ana Pérez, `2` María Briceño, `3` Pedro Salazar; colegio 2 → `4` Luis Gómez, `5` Carmen Rojas, `6` Daniela Ortiz; colegio 3 → `7` José Medina, `8` Rosa Villalobos.
  - `sample_visits.json`: 6 visitas con fechas pasadas (octubre y noviembre de 2026) que combinan colegios y tipos. Incluye `created_at`/`updated_at` explícitos y `deleted_at: null`, porque `loaddata` no aplica `auto_now_add`.
  - `manage.py seed_demo`: hace `loaddata schools_teachers`; carga `sample_visits` solo si `not Visit.all_objects.exists()`; crea el superusuario desde `DJANGO_SUPERUSER_USERNAME/PASSWORD/EMAIL` si no existe. Imprime una línea por cada paso.

- [ ] **Step 1: Escribir los tests que fallan:**

```python
def test_seed_is_idempotent_and_loads_catalog(settings, monkeypatch): ...
    # call_command("seed_demo") dos veces → School.count()==3, Teacher.count()==8, Visit.all_objects.count()==6
def test_seed_does_not_resurrect_deleted_or_edited_visits():
    call_command("seed_demo")
    v = Visit.objects.first(); v.soft_delete()
    call_command("seed_demo")
    assert Visit.all_objects.get(pk=v.pk).deleted_at is not None
def test_seed_creates_superuser_from_env(monkeypatch): ...  # DJANGO_SUPERUSER_USERNAME=demo → User existe y es superuser
```

- [ ] **Step 2: Ejecutar y verificar que fallan.** Expected: FAIL (no existe el comando).
- [ ] **Step 3: Escribir los fixtures y el comando.**
- [ ] **Step 4: Ejecutar.** Run: `uv run pytest visits/tests/test_seed.py -q`. Expected: `3 passed`.
- [ ] **Step 5: Bitácora + commit.** `git commit -m "feat: datos iniciales y comando seed_demo idempotente"`

---

### Task 7: Docker del backend, compose y Makefile

**Files:**
- Create: `backend/Dockerfile`, `backend/.dockerignore`, `docker-compose.yml`, `Makefile`

**Interfaces:**
- Produces:
  - Servicio `db`: `postgres:17`, volumen con nombre `pgdata`, healthcheck `pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB` (cada 3 s, 20 reintentos).
  - Servicio `backend`: build `./backend`; `env_file: .env` (copiar desde `.env.example` si no existe; lo hace `make up`); puerto `${BACKEND_PORT:-8000}:8000`; volumen `./backend:/app` para recarga en desarrollo, con el entorno virtual en `/opt/venv` (`UV_PROJECT_ENVIRONMENT`); `depends_on: db: condition: service_healthy`; comando `sh -c "uv run python manage.py migrate && uv run python manage.py seed_demo && uv run python manage.py runserver 0.0.0.0:8000"`; healthcheck `python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/schools/')"`.
  - Makefile: `up` (crea `.env` desde `.env.example` si falta y ejecuta `docker compose up -d --build --wait`), `down`, `reset` (`down -v`), `logs`, `test` (`docker compose run --rm backend uv run pytest -q`), `seed`, `lint` (ruff check y format --check), `types` y `e2e` (las completan las Tareas 9 y 14). `make` sin objetivo muestra la ayuda.
  - Dockerfile: `python:3.13-slim`, copia `uv` desde `ghcr.io/astral-sh/uv:latest`, ejecuta `uv sync --frozen` en `/opt/venv` y define `WORKDIR /app`.

- [ ] **Step 1: Escribir el Dockerfile, el compose (por ahora sin el servicio frontend) y el Makefile.**
- [ ] **Step 2: Verificar el arranque en frío.** Run: `docker rm -f visitas-pg; make reset; make up`. Expected: `docker compose ps` muestra `db` y `backend` como `healthy`, y `curl -s localhost:8000/api/schools/` devuelve 3 colegios.
- [ ] **Step 3: Verificar los tests dentro de Docker.** Run: `make test`. Expected: todo pasa.
- [ ] **Step 4: Verificar que un reinicio no resucita visitas.** Run: `curl -X DELETE localhost:8000/api/visits/1/`, luego `make down && make up` y `curl -s -o /dev/null -w "%{http_code}" localhost:8000/api/visits/1/`. Expected: `404`.
- [ ] **Step 5: Bitácora + commit.** `git commit -m "chore: docker-compose con healthchecks y Makefile"`

---

### Task 8: Esqueleto del frontend, estilos de Kurios y proxy

**Files:**
- Create: `frontend/` con `create-next-app` (TypeScript, App Router, ESLint, sin Tailwind, sin `src/`), `frontend/next.config.ts`, `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/.prettierrc`, `frontend/public/kurios-k.png`
- Create: `frontend/styles/_tokens.scss`, `_mixins.scss`, `globals.scss`, `frontend/app/layout.tsx`, `frontend/app/providers.tsx`, `frontend/components/{NavBar,Footer,Button}/…`
- Modify: `docker-compose.yml` (servicio `frontend`), `Makefile`

**Interfaces:**
- Produces:
  - `next.config.ts`: `skipTrailingSlashRedirect: true` y `rewrites()` → `[{ source: "/api/:path*/", destination: \`${BACKEND_URL}/api/:path*/\` }, { source: "/api/:path*", destination: \`${BACKEND_URL}/api/:path*\` }]`, con `BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000"`. Aquí se fija el detalle de las barras finales que el spec dejó al implementador: las peticiones a `/api` llegan a Django exactamente como se enviaron.
  - `Dockerfile`: `node:24-alpine`, `ARG BACKEND_URL`, `ENV BACKEND_URL=$BACKEND_URL`, `npm ci`, `npm run build` y `CMD ["npm","start"]`. En compose: `build.args.BACKEND_URL: http://backend:8000`, puerto `${FRONTEND_PORT:-3000}:3000`, `depends_on: backend: condition: service_healthy`.
  - `_tokens.scss`: variables CSS en `:root` con los valores del diseño del frontend (sección "Dirección visual"), con sus nombres `--kurios-*`, más `--radius-control: 13px`, `--radius-card: 20px`, `--shadow-nav: 0 10px 30px rgba(31,20,56,.12)`, `--color-error: #B42318` y la escala de tipos 13/15/18/24/32 px.
  - `_mixins.scss`: `focus-ring` (anillo de 2 px en `--kurios-morado-claro`), `card` (blanco, borde `--kurios-line`, `--radius-card`) y `breakpoint($name)` con `md = 640px`.
  - `Button` (`variant: "primary" | "secondary" | "danger" | "ghost"`, se renderiza como `<button>` o como `Link` si recibe `href`; altura mínima de 44 px).
  - `NavBar` (píldora flotante: símbolo k, "Registro de visitas", enlace activo "Visitas", botón "Registrar visita" oculto en `/visitas/nueva`, texto corto "Registrar" por debajo de 640 px) y `Footer` (franja con degradado y la línea "Kurios Education · Registro de visitas").
  - `providers.tsx` (`"use client"`): `QueryClientProvider` (`retry: 1` en las consultas, `0` en las mutaciones) + `NuqsAdapter` de `nuqs/adapters/next/app`. `layout.tsx`: Lexend 400/500 con `next/font/google`, `<html lang="es">`, `NavBar`, `Footer`, `<Toaster position="bottom-right" />` de sonner y `metadata.title` con plantilla `"%s · Kurios"`.
  - Dependencias: `@tanstack/react-query react-hook-form zod @hookform/resolvers openapi-fetch nuqs sonner lucide-react sass`; dev: `openapi-typescript @playwright/test prettier`.

- [ ] **Step 1: Crear la app.** Run: `npx create-next-app@latest frontend --ts --eslint --app --no-tailwind --no-src-dir --import-alias "@/*" --use-npm`. Comprobar que `next` es ≥ 16.3 (`npm ls next`) y, si no lo es, anotarlo. Instalar las dependencias. Leer el `AGENTS.md` que genera `next dev` y seguirlo.
- [ ] **Step 2: Descargar el símbolo** desde `https://www.kuriosedu.com/media/49001efef4d1.png` a `public/kurios-k.png`.
- [ ] **Step 3: Implementar los tokens, los mixins, el layout, los providers, `NavBar`, `Footer`, `Button`, `next.config.ts`, el Dockerfile y el servicio en compose.** `app/page.tsx` muestra por ahora solo el título "Visitas".
- [ ] **Step 4: Verificar el proxy y las barras finales.** Run: `make up`, luego `curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/schools/`, que debe dar `200` (no `308`). Después `curl -s -X POST localhost:3000/api/visits/ -H 'Content-Type: application/json' -d '{"school":1,"teacher":1,"visit_date":"2026-11-01","visit_type":"MEETING","observations":"proxy ok"}' -w "%{http_code}"`, que debe dar `201`.
- [ ] **Step 5: Verificar la calidad.** Run: `cd frontend && npx tsc --noEmit && npm run lint && npx prettier --check .`. Expected: sin errores.
- [ ] **Step 6: Bitácora + commit.** `git commit -m "feat: esqueleto del frontend con estilos de Kurios y proxy a la API"`

---

### Task 9: Contrato generado y cliente de API

**Files:**
- Create: `frontend/lib/api/schema.d.ts` (generado), `frontend/lib/api/types.ts`, `frontend/lib/api/errors.ts`, `frontend/lib/api/client.ts`
- Modify: `Makefile` (`types`)

**Interfaces:**
- Consumes: `backend/schema.yml` (Tarea 5).
- Produces:
  - `make types`: ejecuta `docker compose run --rm --no-deps backend uv run python manage.py spectacular --file schema.yml --validate`, después `cd frontend && npx openapi-typescript ../backend/schema.yml -o lib/api/schema.d.ts` y por último `npx prettier --write lib/api/schema.d.ts`.
  - `types.ts`: `Visit = components["schemas"]["VisitOutput"]`, `VisitInput = components["schemas"]["VisitInputRequest"]`, `School`, `Teacher`, `VisitType = Visit["visit_type"]`, `VisitFilters = { school: number | null; visit_type: VisitType | null }`.
  - `errors.ts`: `class ApiError extends Error { kind: "validation" | "not_found" | "network" | "server"; status?: number; fields: Record<string, string[]>; nonField: string[] }` y `normalizeError(input: { response?: Response; error?: unknown; thrown?: unknown }): ApiError` (400 → `validation`, con `fields` sin `non_field_errors` ni `detail`, que van a `nonField`; 404 → `not_found`; excepción de fetch → `network`; resto → `server`).
  - `client.ts`: `api = createClient<paths>({ baseUrl: "" })` (las rutas del schema ya empiezan por `/api/`) y funciones que lanzan `ApiError`: `listVisits(f: VisitFilters): Promise<Visit[]>`, `getVisit(id: number): Promise<Visit>`, `createVisit(body: VisitInput): Promise<Visit>`, `updateVisit(id: number, body: VisitInput): Promise<Visit>` (PUT), `deleteVisit(id: number): Promise<void>`, `listSchools(): Promise<School[]>`, `listTeachers(schoolId: number): Promise<Teacher[]>`. Los filtros `null` no se envían.

- [ ] **Step 1: Ejecutar `make types`** y verificar que `schema.d.ts` contiene `"/api/visits/"`.
- [ ] **Step 2: Escribir `types.ts`, `errors.ts` y `client.ts`.**
- [ ] **Step 3: Verificar que el contrato protege.** Renombrar temporalmente `teacher_name` a `teacher_nombre` en `client.ts` o en algún consumidor de prueba y comprobar que `npx tsc --noEmit` falla; después revertir. Expected: un error de tipos y, tras revertir, compilación limpia.
- [ ] **Step 4: Verificar que la generación es estable.** Run: `make types && git diff --exit-code backend/schema.yml frontend/lib/api/schema.d.ts`. Expected: código de salida 0.
- [ ] **Step 5: Bitácora + commit.** `git commit -m "feat: tipos generados desde OpenAPI y cliente de API con errores normalizados"`

---

### Task 10: Hooks de datos, formato de fechas y Playwright

**Files:**
- Create: `frontend/lib/queries/keys.ts`, `visits.ts`, `catalog.ts`, `frontend/lib/format.ts`, `frontend/lib/today.ts`, `frontend/playwright.config.ts`, `frontend/e2e/helpers.ts`

**Interfaces:**
- Consumes: el cliente de la Tarea 9.
- Produces:
  - `visitKeys = { all: ["visits"] as const, list: (f: VisitFilters) => [...visitKeys.all, "list", f] as const, detail: (id: number) => [...visitKeys.all, "detail", id] as const }`; `catalogKeys.schools`, `catalogKeys.teachers(schoolId)`.
  - `useVisits(f)`, `useVisit(id)` (sin reintentos ante `not_found`), `useCreateVisit()`, `useUpdateVisit(id)`, `useDeleteVisit()`. Las mutaciones invalidan `visitKeys.all` al terminar bien. `useSchools()` y `useTeachers(schoolId: number | null)` (`enabled: schoolId !== null`, `staleTime: 5 min`).
  - `format.ts`: `formatShortDate("2026-11-12") → "12 nov 2026"`, `formatLongDate → "jueves, 12 de noviembre de 2026"` y `formatDateTimeShort(iso)` para "Registrada el…". Todo con `Intl.DateTimeFormat("es-VE")`, leyendo `YYYY-MM-DD` como fecha local (nunca `new Date("YYYY-MM-DD")`, que la interpreta en UTC).
  - `today.ts`: `todayISO(): string` en la hora local del navegador, como `YYYY-MM-DD`.
  - `playwright.config.ts`: `baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000"`, un solo proyecto con chromium, `fullyParallel: false`, `retries: process.env.CI ? 1 : 0`.
  - `e2e/helpers.ts`: `createVisitViaApi(request: APIRequestContext, overrides?: Partial<VisitInput>): Promise<Visit>`, que hace POST a `/api/visits/` con colegio 2, docente 4, ayer, `MEETING` y observaciones únicas `e2e-${Date.now()}-${Math.random()}`; `deleteVisitViaApi(request, id)`; `uniqueText(prefix)`; `fillValidForm(page: Page, overrides?: { school?: string; teacher?: string; date?: string; type?: "Visita en aula" | "Encuentro"; observations?: string })`, que por defecto rellena U.E. Monte Claro / José Medina / `2026-11-02` / "Visita en aula" / `uniqueText("form")` usando los labels del formulario.

- [ ] **Step 1: Implementar los archivos** según Interfaces. Instalar los navegadores con `npx playwright install chromium`.
- [ ] **Step 2: Verificar.** Run: `npx tsc --noEmit && npm run lint`. Expected: sin errores.
- [ ] **Step 3: Bitácora + commit.** `git commit -m "feat: hooks de TanStack Query, formato de fechas y base de Playwright"`

---

### Task 11: Pantalla de listado

**Files:**
- Create: `frontend/components/{VisitTable,VisitFilters,TypeBadge,EmptyState,ErrorState}/…`, `frontend/e2e/list.spec.ts`
- Modify: `frontend/app/page.tsx`; Create: `frontend/app/ListContainer.tsx`

**Interfaces:**
- Consumes: `useVisits`, `useSchools`, `formatShortDate`, `Button`.
- Produces:
  - `TypeBadge({ type: VisitType })`: un punto con el color de marca sobre un fondo `-10` y el texto en `--kurios-ink`.
  - `VisitTable({ visits: Visit[]; hrefFor: (v: Visit) => string; loading?: boolean })`: tabla con las columnas Fecha, Colegio, Docente y Tipo. El enlace va en la celda de la fecha, con el patrón *stretched link* (`::after` absoluto sobre una `tr` con `position: relative`) y `aria-label` "<fecha>, ver visita". Mientras carga muestra 3 filas fantasma. Por debajo de 640 px cada fila se apila.
  - `VisitFilters({ schools: School[]; value: VisitFilters; onChange(next: VisitFilters): void; onClear(): void })`: dos `<select>` con `<label>` ("Colegio", "Tipo") y las opciones "Todos los colegios" / "Todos los tipos". "Limpiar filtros" solo aparece si hay algún filtro activo.
  - `EmptyState({ message: string; action?: ReactNode })` y `ErrorState({ message: string; onRetry(): void })`.
  - `app/ListContainer.tsx` (renderizado por `app/page.tsx`): `useQueryStates({ school: parseAsInteger, visit_type: parseAsStringLiteral(["CLASSROOM","MEETING"]) })`. En un efecto, si la URL trae `school` o `visit_type` pero el valor parseado es `null`, lo quita de la URL con `history: "replace"`. Contador "N visitas" / "1 visita". El `hrefFor` de cada fila conserva la query actual (`/visitas/12?school=2`). Textos exactos de los estados en el spec principal, sección "1. Listado".

- [ ] **Step 1: Escribir el E2E que falla** en `e2e/list.spec.ts`:

```ts
test("filters apply on change, live in the URL and survive reload", async ({ page, request }) => {
  const v = await createVisitViaApi(request, { school: 2, teacher: 4, visit_type: "MEETING" });
  await page.goto("/");
  await page.getByLabel("Colegio").selectOption({ label: "Colegio El Ávila" });
  await page.getByLabel("Tipo").selectOption({ label: "Encuentro" });
  await expect(page).toHaveURL(/school=2/);
  await expect(page).toHaveURL(/visit_type=MEETING/);
  await page.reload();
  const rows = page.getByRole("row").filter({ hasNot: page.getByRole("columnheader") });
  for (const row of await rows.all()) {
    await expect(row).toContainText("Colegio El Ávila");
    await expect(row).toContainText("Encuentro");
  }
  await expect(page.getByText(/\d+ visitas?/)).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page).not.toHaveURL(/school=/);
});
test("invalid filter in the URL is ignored and removed", async ({ page }) => {
  await page.goto("/?visit_type=XYZ");
  await expect(page).not.toHaveURL(/visit_type/);
  await expect(page.getByRole("table")).toBeVisible();
});
test("each row exposes a single link to the detail", async ({ page, request }) => {
  const v = await createVisitViaApi(request);
  await page.goto("/");
  await page.getByRole("link", { name: /ver visita/ }).first().click();
  await expect(page).toHaveURL(/\/visitas\/\d+/);
});
```

- [ ] **Step 2: Ejecutar y verificar que falla.** Run: `make up && cd frontend && npx playwright test e2e/list.spec.ts`. Expected: FAIL (no existen los labels).
- [ ] **Step 3: Implementar los componentes y la página.**
- [ ] **Step 4: Ejecutar.** Expected: `3 passed`. Revisar a mano los estados de carga, vacío y error (`docker compose stop backend`) y el ancho de 375 px.
- [ ] **Step 5: Bitácora + commit.** `git commit -m "feat: listado de visitas con filtros en la URL y estados"`

---

### Task 12: Detalle, eliminar y "no encontrada"

**Files:**
- Create: `frontend/components/{VisitDetail,ConfirmDialog,NotFound}/…`, `frontend/app/visitas/[id]/page.tsx`, `frontend/app/visitas/[id]/DetailContainer.tsx`, `frontend/e2e/detail.spec.ts`

**Interfaces:**
- Consumes: `useVisit`, `useDeleteVisit`, los formateadores y `TypeBadge`.
- Produces:
  - `VisitDetail({ visit: Visit })`: título "Visita del <fecha corta>" con `TypeBadge`; un `<dl>` con Colegio, Docente visitado, Fecha (larga), Tipo y Observaciones (`white-space: pre-line`); la línea "Registrada el … · Última edición el …", donde la edición solo aparece si `updated_at` y `created_at` difieren en más de un minuto.
  - `ConfirmDialog({ open: boolean; title: string; body: string; confirmLabel: string; onConfirm(): void; onCancel(): void; busy?: boolean })`: usa el `<dialog>` nativo con `showModal()`, foco inicial en Cancelar y cierre con Esc (evento `cancel`).
  - `NotFound()`: "Esta visita no existe o fue eliminada." más el botón "Volver a visitas".
  - `app/visitas/[id]/page.tsx`: un ID no numérico, un `not_found` o una visita eliminada muestran `NotFound`. "Volver a visitas" lleva a `/` con la query `school`/`visit_type` recibida. Al confirmar la eliminación: `toast.success("Visita eliminada")` y `router.push("/" + query)`. "Editar" lleva a `/visitas/[id]/editar`.

- [ ] **Step 1: Escribir el E2E que falla** en `e2e/detail.spec.ts`:

```ts
test("delete with confirmation hides the visit and its URL shows not found", async ({ page, request }) => {
  const v = await createVisitViaApi(request);
  await page.goto(`/visitas/${v.id}`);
  await page.getByRole("button", { name: "Eliminar visita" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await dialog.getByRole("button", { name: "Eliminar visita" }).click();
  await expect(page.getByText("Visita eliminada")).toBeVisible();
  await expect(page).toHaveURL(/\/$|\/\?/);
  await expect(page.getByText(v.observations)).toHaveCount(0);
  await page.goto(`/visitas/${v.id}`);
  await expect(page.getByText("Esta visita no existe o fue eliminada.")).toBeVisible();
});
test("back link keeps list filters", async ({ page, request }) => {
  const v = await createVisitViaApi(request, { school: 2 });
  await page.goto(`/visitas/${v.id}?school=2`);
  await page.getByRole("link", { name: "Volver a visitas" }).click();
  await expect(page).toHaveURL(/school=2/);
});
test("non-numeric id shows not found", async ({ page }) => {
  await page.goto("/visitas/abc");
  await expect(page.getByText("Esta visita no existe o fue eliminada.")).toBeVisible();
});
```

- [ ] **Step 2: Ejecutar y verificar que falla.** Expected: FAIL.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Ejecutar.** Run: `npx playwright test e2e/detail.spec.ts`. Expected: `3 passed`.
- [ ] **Step 5: Bitácora + commit.** `git commit -m "feat: detalle de visita con eliminación confirmada y pantalla no encontrada"`

---

### Task 13: Formulario de registrar y editar

**Files:**
- Create: `frontend/lib/forms/visitSchema.ts`, `frontend/components/VisitForm/…`, `frontend/app/visitas/nueva/{page,NewVisitContainer}.tsx`, `frontend/app/visitas/[id]/editar/{page,EditContainer}.tsx`, `frontend/e2e/form.spec.ts`

**Interfaces:**
- Consumes: `useSchools`, `useTeachers`, `useCreateVisit`, `useUpdateVisit`, `useVisit`, `todayISO`, `ApiError`, `NotFound`.
- Produces:
  - `visitSchema` (Zod), con valores del formulario de tipo string: `school` y `teacher` como string no vacío ("Elige un colegio." / "Elige el docente visitado."); `visit_date` no vacía ("Indica la fecha de la visita."), con `>= "2000-01-01"` ("Revisa la fecha: parece demasiado antigua.") y `<= todayISO()` ("La fecha de la visita no puede ser posterior a hoy."; en un `refine` para que "hoy" se calcule al validar y no al cargar el módulo); `visit_type` como enum `["CLASSROOM","MEETING"]` ("Elige un tipo de visita."); `observations` con `.trim()`, mínimo 1 ("Escribe las observaciones de la visita.") y máximo 5000 ("Máximo 5000 caracteres."). `toVisitInput(values): VisitInput` convierte los IDs a número.
  - `VisitForm({ mode: "create" | "edit"; defaultValues?: Partial<VisitFormValues>; extraTeacher?: Teacher; onSubmit(values: VisitInput): Promise<void>; serverError?: ApiError | null; onCancelHref: string })`:
    - Orden de campos: Colegio, Docente visitado, Fecha de la visita, Tipo de visita (dos radios), Observaciones (con contador "N / 5000").
    - El docente está deshabilitado con "Primero elige un colegio" hasta que haya colegio; muestra "Cargando docentes…" mientras carga y "Este colegio no tiene docentes registrados" si la lista viene vacía (en ese caso el envío se bloquea). Al cambiar el colegio, el docente se limpia si no pertenece al nuevo. `extraTeacher` siempre aparece en la lista: es el docente actual de una visita antigua.
    - `mode: "onBlur"`, con el foco en el primer error al enviar. Los errores llevan `aria-describedby` y un icono de `lucide-react` (`CircleAlert`).
    - `serverError.fields` se aplica con `setError` por campo y `nonField` va en un aviso encima del formulario.
    - Mientras envía, el botón está deshabilitado con "Guardando…". El botón principal dice "Registrar visita" al crear y "Guardar cambios" al editar.
  - Crear: si sale bien, `toast.success("Visita registrada")` y `router.push(/visitas/{id})`.
  - Editar: precarga los datos; si el `ApiError` es `not_found` (al cargar o al guardar), muestra `NotFound`; si sale bien, `toast.success("Cambios guardados")` y lleva al detalle.

- [ ] **Step 1: Escribir el E2E que falla** en `e2e/form.spec.ts`:

```ts
test("create a valid visit lands on its detail with toast and multiline text", async ({ page }) => {
  const obs = `${uniqueText("crear")}\nSegunda línea — ñ 🚀`;
  await page.goto("/visitas/nueva");
  await page.getByLabel("Colegio").selectOption({ label: "U.E. Monte Claro" });
  await page.getByLabel("Docente visitado").selectOption({ label: "José Medina" });
  await page.getByLabel("Fecha de la visita").fill("2026-11-02");
  await page.getByLabel("Visita en aula").check();
  await page.getByLabel("Observaciones").fill(obs);
  await page.getByRole("button", { name: "Registrar visita" }).click();
  await expect(page.getByText("Visita registrada")).toBeVisible();
  await expect(page).toHaveURL(/\/visitas\/\d+$/);
  await expect(page.getByText("Segunda línea — ñ 🚀")).toBeVisible();
});
test("empty submit shows field errors and focuses the first", async ({ page }) => {
  await page.goto("/visitas/nueva");
  await page.getByRole("button", { name: "Registrar visita" }).click();
  for (const msg of ["Elige un colegio.", "Elige el docente visitado.", "Indica la fecha de la visita.",
                     "Elige un tipo de visita.", "Escribe las observaciones de la visita."])
    await expect(page.getByText(msg)).toBeVisible();
  await expect(page.getByLabel("Colegio")).toBeFocused();
});
test("changing school clears the teacher", async ({ page }) => {
  await page.goto("/visitas/nueva");
  await expect(page.getByLabel("Docente visitado")).toBeDisabled();
  await page.getByLabel("Colegio").selectOption({ label: "U.E. Los Samanes" });
  await page.getByLabel("Docente visitado").selectOption({ label: "Ana Pérez" });
  await page.getByLabel("Colegio").selectOption({ label: "Colegio El Ávila" });
  await expect(page.getByLabel("Docente visitado")).toHaveValue("");
});
test("server-side date error is shown on the field", async ({ page }) => {
  await page.goto("/visitas/nueva");
  // quitar el max del input y saltarse Zod no es posible desde la UI, así que se fuerza por la red:
  await page.route("**/api/visits/", r => r.fulfill({ status: 400, contentType: "application/json",
    body: JSON.stringify({ visit_date: ["La fecha de la visita no puede ser posterior a hoy."] }) }));
  await fillValidForm(page);
  await page.getByRole("button", { name: "Registrar visita" }).click();
  await expect(page.getByText("La fecha de la visita no puede ser posterior a hoy.")).toBeVisible();
});
test("edit saves changes and returns to detail", async ({ page, request }) => {
  const v = await createVisitViaApi(request);
  await page.goto(`/visitas/${v.id}/editar`);
  await expect(page.getByRole("heading", { name: "Editar visita" })).toBeVisible();
  await page.getByLabel("Observaciones").fill("Editada en e2e");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados")).toBeVisible();
  await expect(page.getByText("Editada en e2e")).toBeVisible();
});
test("editing a deleted visit shows not found", async ({ page, request }) => {
  const v = await createVisitViaApi(request);
  await page.goto(`/visitas/${v.id}/editar`);
  await deleteVisitViaApi(request, v.id);
  await page.getByLabel("Observaciones").fill("tarde");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Esta visita no existe o fue eliminada.")).toBeVisible();
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan.** Expected: FAIL.
- [ ] **Step 3: Implementar el esquema, el formulario y las dos páginas.**
- [ ] **Step 4: Ejecutar toda la suite E2E.** Run: `npx playwright test`. Expected: todo pasa.
- [ ] **Step 5: Bitácora + commit.** `git commit -m "feat: formulario de registrar y editar visitas con validación y errores del servidor"`

---

### Task 14: E2E aislado, CI y pre-commit

**Files:**
- Create: `.github/workflows/ci.yml`, `.pre-commit-config.yaml`
- Modify: `Makefile` (`e2e`, `lint`)

**Interfaces:**
- Produces:
  - `make e2e`: ejecuta `FRONTEND_PORT=3100 BACKEND_PORT=8100 docker compose -p e2e up -d --build --wait`, después `cd frontend && E2E_BASE_URL=http://localhost:3100 npx playwright test` (guardando el código de salida), luego `docker compose -p e2e down -v` y termina con el código de salida de Playwright. El proyecto `e2e` tiene su propio volumen, así que nunca toca los datos de la demo.
  - CI (`on: [push, pull_request]`), con dos jobs:
    - `backend`: `services.postgres: postgres:17` con healthcheck; `astral-sh/setup-uv`; `uv sync --frozen`; `ruff check`; `ruff format --check`; `pytest -q` con `DATABASE_URL=postgres://visitas:visitas@localhost:5432/visitas`. Además `manage.py spectacular --file schema.yml --validate && git diff --exit-code schema.yml`.
    - `frontend`: `actions/setup-node` con `node-version-file: .nvmrc`; `npm ci`; `npx openapi-typescript ../backend/schema.yml -o lib/api/schema.d.ts && npx prettier --write lib/api/schema.d.ts && git diff --exit-code lib/api/schema.d.ts`; `npm run lint`; `npx prettier --check .`; `npx tsc --noEmit`.
  - `pre-commit`: ruff (lint con `--fix`), ruff-format, prettier (solo `frontend/`) y eslint (hook local con `npm --prefix frontend run lint`).

- [ ] **Step 1: Implementar `make e2e` y ejecutarlo.** Expected: Playwright pasa y `docker volume ls` no muestra volúmenes `e2e_*` al terminar. La demo en `:3000` conserva sus datos.
- [ ] **Step 2: Escribir `ci.yml` y `.pre-commit-config.yaml`.** Run: `pre-commit run --all-files`. Expected: todo pasa o se corrige solo; volver a ejecutar y verificar que pasa.
- [ ] **Step 3: Bitácora + commit.** `git commit -m "ci: E2E aislado, GitHub Actions y pre-commit"`

---

### Task 15: README, revisión final y entrega

**Files:**
- Create: `README.md`, `docs/screenshot-listado.png`
- Modify: `docs/ai-log.md`

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: Hacer la auditoría de interfaz** con el skill `web-design-guidelines` sobre `frontend/app` y `frontend/components`. Corregir lo que salga y hacer commit (`fix: ajustes de accesibilidad e interfaz`).
- [ ] **Step 2: Hacer una pasada exploratoria** con el skill `webapp-testing` a 375 px y a 1440 px sobre los cuatro flujos. Guardar una captura del listado en `docs/screenshot-listado.png`.
- [ ] **Step 3: Escribir el `README.md`** con las seis secciones de "README (estructura obligatoria)" del spec principal, en ese orden:
  - El badge de la CI (la URL se completa en el Step 7).
  - Las URLs de la app, Swagger y el admin, con las credenciales de demo `admin` / `admin`.
  - Cómo restaurar una visita desde el admin.
  - El modo nativo: Postgres, luego `uv sync` y `uv run python manage.py migrate && uv run python manage.py seed_demo && uv run python manage.py runserver`, después `npm install` y `BACKEND_URL=http://localhost:8000 npm run dev`.
  - Lo que quedó fuera y la siguiente iteración (lista del spec, más los E2E en la CI).
- [ ] **Step 4: Redactar el borrador de «Uso de inteligencia artificial»** a partir de `docs/ai-log.md`. Debe decir:
  - Qué herramientas se usaron: Claude Code con Claude Opus 5.5, los skills de superpowers, `django-expert`, `frontend-design`, `web-design-guidelines`, `webapp-testing` y Playwright MCP para estudiar kuriosedu.com.
  - En qué partes se usaron: diseño, código, tests y documentación.
  - Qué se corrigió, solo con hechos de la bitácora.
  Marcar el borrador con `<!-- BORRADOR: revisar antes de entregar -->`.
- [ ] **Step 5: Revisión del autor (bloqueante).** Pedir al usuario que lea y ajuste la sección de IA. Aplicar sus cambios, quitar el comentario de borrador y anotar en la bitácora lo que corrigió.
- [ ] **Step 6: Verificación final desde un clon limpio.** Run: `git clone . /tmp/visitas-check && cd /tmp/visitas-check && make up && make test && make e2e && make down`. Expected: todo en verde. Recorrer la guía de revisión (https://claude.ai/artifact/FSyova7Ubat3xdMbhRCgfR) junto al usuario y leer con `ArtifactData` (colección `checks`) los ítems marcados como `bad` para corregirlos.
- [ ] **Step 7: Publicar (con confirmación del usuario).** Preguntar el nombre del repo. Con su visto bueno, ejecutar `gh repo create <nombre> --public --source . --push`, completar la URL del badge en el README y empujar. Verificar que la CI pasa en GitHub.
- [ ] **Step 8: Commit final.** `git commit -m "docs: README con instrucciones, decisiones y uso de IA"`. Recordar al usuario que envíe el enlace por correo antes del lunes 23 a las 12:00.
