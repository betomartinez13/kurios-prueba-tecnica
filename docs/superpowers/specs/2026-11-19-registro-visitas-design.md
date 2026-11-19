# Registro de visitas a colegios — Diseño

Fecha: 2026-11-19 · Entrega: lunes 2026-11-23, 12:00 (mediodía)

Este es el documento principal: **qué** se construye (objetivos, modelo de datos,
contrato de la API, pantallas, flujos, casos borde, pruebas y entrega). **Cómo** se
construye cada lado está en:
- [Diseño del backend](2026-11-19-backend-design.md): paquetes, arquitectura por capas
  (services + selectors), patrones y datos iniciales.
- [Diseño del frontend](2026-11-19-frontend-design.md): paquetes, arquitectura, patrones,
  cómo se construye el estilo y dirección visual alineada con kuriosedu.com.

Si hay contradicción, manda este documento.

## Intención

Prueba técnica en casa para el puesto de Desarrollador Fullstack en Kurios Education.
Especialistas visitan colegios para acompañar a docentes y, tras cada visita, registran
una planilla con lo observado. La app permite **registrar y consultar** esas visitas.

Lo que evalúan: lógica, orden y claridad por encima del tamaño. Texto literal del
enunciado: *"valoramos mucho más una solución pequeña, limpia, ordenada y que funcione
bien, que una grande e incompleta"*. Cada decisión de este documento se mide contra eso.

## Objetivos

1. Registrar una visita: colegio, docente visitado, fecha, tipo (*visita en aula* o
   *encuentro*) y observaciones.
2. Listar visitas, filtrando por colegio y por tipo.
3. Ver el detalle de una visita y editarla.
4. Eliminación lógica: la visita deja de verse en la interfaz, pero el registro se
   conserva en la base de datos.
5. Validar que la fecha no sea futura y que todos los campos obligatorios estén completos.
6. Entregar un repo público con un README que explique la instalación y ejecución, las
   decisiones técnicas, lo que quedó fuera, las mejoras para una siguiente iteración y la
   sección obligatoria **«Uso de inteligencia artificial»**.

## No-objetivos

- Autenticación y usuarios: el enunciado no los pide, así que no hay login.
- Pantallas para crear o editar colegios y docentes: vienen precargados con un fixture.
- Restaurar visitas eliminadas desde la UI.
- Paginación, búsqueda por texto, exportaciones, i18n.

## Anti-objetivos (fallaría aunque "funcione")

- Que el evaluador no consiga levantarlo con los pasos del README.
- Validación solo en el frontend: la API debe rechazar por sí misma los datos inválidos.
- Que un borrado lógico se filtre en algún sitio: si una visita eliminada aparece en el
  listado, en el detalle o en la edición, es un bug.
- Una sección de IA genérica o incompleta (omitirla resta puntos).
- Sobreingeniería que oscurezca la lógica (capas, abstracciones o librerías innecesarias).

## Restricciones

- Backend: Python + Django + Django REST Framework, base de datos PostgreSQL.
- Frontend: Next.js (elegido por el usuario) con TypeScript y SASS, que es el stack
  "deseable" del perfil.
- Ejecución local con `docker compose up` (Docker ya disponible en la máquina del autor).
- Datos ficticios: ningún colegio, docente ni estudiante real.
- UI en español.

## Enfoques considerados

Cómo se comunica Next.js con Django:

| Enfoque | Qué es | Contras |
|---|---|---|
| **A. Componentes de cliente + proxy** *(elegido)* | Las páginas hacen `fetch('/api/...')` desde el navegador. `next.config` reenvía `/api/*` al backend Django. | Se renuncia al render en servidor, que aquí no aporta nada. |
| B. Server Components + Server Actions | Las lecturas se hacen en el servidor de Next y las mutaciones con Server Actions que llaman a Django por la red interna de Docker. | Dos capas de validación, dos URLs según el contexto, más difícil de depurar y explicar. |
| C. Mixto | Lecturas en el servidor y formularios en el cliente. | Suma la complejidad de A y de B. |

El usuario eligió **A**: una sola forma de pedir datos, sin CORS (mismo origen gracias al
proxy), y los errores de validación de DRF se pintan directamente en el formulario. La
lógica importante (validación, borrado lógico) vive en Django, donde se prueba.

Para el stack de frontend se consideró también HTML + JS sin framework; el usuario eligió Next.js.

Otras decisiones con alternativas, todas tomadas por el usuario:
- **Lógica de negocio**: *services + selectors (HackSoft)* frente a *DRF clásico* (la
  lógica en `validate()`/`create()` del serializer). Se eligió services + selectors: las
  reglas quedan en un solo sitio y se prueban sin pasar por HTTP, a cambio de dos archivos
  más.
- **Tipos de la API en el frontend**: *generados desde OpenAPI* frente a *escritos a mano*.
  Se eligieron los generados: un desajuste rompe la compilación, a cambio de un paso de
  generación (`make types`).
- **Dependencias de Python**: *uv + pyproject* frente a *pip + requirements.txt*. Se eligió
  uv por tener versiones fijadas y reproducibles.
- **Tests del frontend**: *E2E con Playwright* frente a *Vitest unitario* o *solo lint +
  tsc*. Se eligió E2E: prueba los flujos reales de punta a punta, a cambio de necesitar el
  stack levantado.

## Decisiones tomadas

### Modelo de datos (usuario: el docente pertenece a un colegio)

- `School`: `name` (único).
- `Teacher`: `first_name`, `last_name`, `school` (FK → School, `PROTECT`).
- `Visit`:
  - `school` (FK → School, `PROTECT`)
  - `teacher` (FK → Teacher, `PROTECT`)
  - `visit_date` (`DateField`)
  - `visit_type` (`TextChoices`: `CLASSROOM` = "Visita en aula", `MEETING` = "Encuentro")
  - `observations` (`TextField`, obligatorio y no vacío)
  - `is_deleted` (bool, por defecto False), `deleted_at` (datetime, nulo)
  - `created_at`, `updated_at`
  - `Meta.indexes`: `(is_deleted, visit_date)` para el listado ordenado, y `(is_deleted,
    school, visit_type)` para los filtros. Con este volumen apenas importan, pero
    documentan los patrones de consulta.
- Todos los modelos definen `__str__` legible, que es lo que se ve en el admin y en los
  mensajes de error.

**Decisión de diseño (Claude):** `Visit` guarda `school` y `teacher` aunque el colegio se
pueda deducir del docente. Si un docente cambia de colegio más adelante, la visita
histórica conserva el colegio donde realmente ocurrió. La coherencia se valida al
guardar: `teacher.school` debe ser igual a `school`, y si no, devuelve un error de validación.

**Campos obligatorios (Claude):** los cinco campos del formulario son obligatorios,
observaciones incluidas, porque la planilla existe para registrar lo observado. Las
observaciones con solo espacios cuentan como vacías.

### Borrado lógico

- Manager por defecto `Visit.objects` → solo visitas con `is_deleted=False`.
  `Visit.all_objects` → todas (para auditoría, admin y tests).
- `DELETE /api/visits/{id}/` pone `is_deleted=True` y `deleted_at=now()`, y responde 204.
- Una visita eliminada responde 404 en GET, PUT, PATCH y DELETE, y no aparece en el listado.
- El admin de Django (`/admin`) queda disponible y muestra todas las visitas con su estado
  `is_deleted` (su queryset usa `Visit.all_objects`). Así un evaluador puede comprobar que
  el registro sigue existiendo.
- **Acceso al admin (decisión de Claude):** al arrancar el backend se crea, si no existe,
  un superusuario de demo con usuario y contraseña tomados de variables de entorno (con
  valores por defecto en `.env.example`). El README los indica. En el modo nativo, el
  README da el comando equivalente.

### Validación de fecha

- En el serializer: `visit_date <= timezone.localdate()`. Si es posterior, responde 400 con
  un mensaje en español.
- `TIME_ZONE` se configura por variable de entorno, con `America/Caracas` como valor por
  defecto. Motivo (decisión de Claude): kuriosedu.com declara que trabaja con colegios de
  Venezuela (`og:locale es_VE`). En el frontend, el input de fecha usa `max` = hoy en la
  hora local del navegador como ayuda de UX. La regla que manda es la del backend (ver
  casos borde).

### API (DRF)

| Método y ruta | Uso |
|---|---|
| `GET /api/schools/` | Lista de colegios (para los selects) |
| `GET /api/teachers/?school={id}` | Docentes, filtrables por colegio |
| `GET /api/visits/?school={id}&visit_type={CLASSROOM\|MEETING}` | Listado filtrado, ordenado por `visit_date` desc y luego `created_at` desc |
| `POST /api/visits/` | Crear |
| `GET /api/visits/{id}/` | Detalle |
| `PUT/PATCH /api/visits/{id}/` | Editar |
| `DELETE /api/visits/{id}/` | Borrado lógico |

- Las respuestas de visita incluyen los IDs y también los nombres legibles (`school_name`,
  `teacher_name`, `visit_type_label`), para que el frontend no tenga que cruzar datos.
- Filtros con `django-filter` (`FilterSet` con `school` y `visit_type`). Un valor de tipo
  inválido responde 400; nunca devuelve en silencio una lista vacía.
- Sin paginación (fuera de alcance; se menciona como mejora).
- Los errores siguen el formato estándar de DRF (`{campo: [mensajes]}`), y el frontend los
  muestra junto a cada campo.
- Este contrato es la frontera entre las dos apps. Se publica como schema OpenAPI en
  `/api/schema/` (Swagger en `/api/docs/`), y de él se generan los tipos del frontend.
  Cómo se implementa cada lado: [diseño del backend](2026-11-19-backend-design.md) y
  [diseño del frontend](2026-11-19-frontend-design.md).

### Pantallas y flujos

Mapa de navegación:

```
            ┌──────────── Cancelar / Volver ────────────┐
            ▼                                           │
   / (Listado) ──Registrar visita──▶ /visitas/nueva ────┤
     │   ▲                               │ Guardar ok    │
     │   │                               ▼              │
     │   └─Eliminar ok── /visitas/[id] (Detalle) ◀──────┘
     │      (aviso)        │   ▲
     └──clic en fila──────▶│   │ Guardar cambios ok (aviso)
                           ▼   │
                   /visitas/[id]/editar
```

Elementos comunes a todas las pantallas:
- **Barra superior flotante** (ver "Dirección visual" en el
  [diseño del frontend](2026-11-19-frontend-design.md)) con el símbolo "k" de Kurios, el
  nombre de la herramienta, "Registro de visitas", y el botón "Registrar visita". El
  símbolo lleva al listado. En el formulario de creación el botón se oculta.
- **Avisos** (toast) en la esquina inferior, con `role="status"`, para confirmar acciones:
  "Visita registrada", "Cambios guardados", "Visita eliminada". Desaparecen a los 4 s y se
  pueden cerrar.
- **Título de pestaña** por pantalla ("Visitas · Kurios", "Nueva visita · Kurios", …).

#### 1. Listado (`/`)

```
   ╭──────────────────────────────────────────────────────────────╮
   │ k  Registro de visitas   Visitas            [Registrar visita] │ ← píldora blanca flotante
   ╰──────────────────────────────────────────────────────────────╯
  (fondo lavanda #F7F5FB)
  Visitas                                     ← título morado claro
  14 visitas

  Colegio [ Todos los colegios ▾ ]  Tipo [ Todos los tipos ▾ ]  Limpiar filtros
 ┌────────────────────────────────────────────────────────────────┐
 │ Fecha         Colegio              Docente       Tipo          │
 │ 12 nov 2026   U.E. Los Samanes     Ana Pérez     ◖Visita en aula◗│
 │ 05 nov 2026   Colegio El Ávila     Luis Gómez    ◖Encuentro◗    │
 └────────────────────────────────────────────────────────────────┘
```

- Los filtros se aplican en cuanto cambian (sin botón "Filtrar") y se reflejan en la URL
  (`/?school=2&visit_type=MEETING`). Recargar la página o compartir el enlace conserva los
  filtros. "Limpiar filtros" solo aparece cuando hay alguno activo.
- El contador ("14 visitas", "1 visita") refleja lo filtrado.
- Cada fila entera es un enlace al detalle, accesible con teclado.
- Estados:
  - **Cargando**: 3 filas fantasma con la forma de la tabla (sin spinner a pantalla completa).
  - **Vacío sin filtros**: "Todavía no hay visitas registradas." + "Registrar visita".
  - **Vacío con filtros**: "No hay visitas que coincidan con estos filtros." + "Limpiar filtros".
  - **Error de red**: "No se pudo conectar con el servidor. Revisa que el backend esté en
    marcha y vuelve a intentarlo." + "Reintentar".
  - **Filtro inválido en la URL** (p. ej. `?visit_type=XYZ` escrito a mano): se ignora ese
    filtro, se limpia de la URL y se muestra el listado sin él.
- Móvil (< 640 px): cada fila se apila: fecha y etiqueta de tipo en la primera línea,
  colegio y docente en la segunda.

#### 2. Registrar visita (`/visitas/nueva`) y 3. Editar (`/visitas/[id]/editar`)

Mismo componente de formulario. Campos en este orden, porque es el orden en que la
especialista piensa la visita:

```
  ← Volver a visitas
  Registrar visita

  Colegio *          [ Selecciona un colegio      ▾ ]
  Docente visitado * [ Primero elige un colegio   ▾ ]   (deshabilitado)
  Fecha de la visita*[ dd/mm/aaaa ]
  Tipo de visita *   ( ) Visita en aula   ( ) Encuentro
  Observaciones *    ┌──────────────────────────────┐
                     │                              │
                     └──────────────────────────────┘
                                          0 / 5000
                     ( Registrar visita )  Cancelar
```

- **Colegio → docente**: el select de docente está deshabilitado con el texto "Primero
  elige un colegio" hasta que haya colegio. Al elegir colegio se cargan sus docentes
  (texto "Cargando docentes…" mientras tanto). Si se cambia el colegio y el docente
  elegido no pertenece al nuevo, el docente se limpia. Si un colegio no tiene docentes:
  "Este colegio no tiene docentes registrados" y el formulario no se puede enviar.
- **Tipo de visita**: dos radio buttons (no un select), porque son solo dos opciones y así
  se ven las dos a la vez.
- **Fecha**: `input type="date"` con `max` = hoy. No hay valor por defecto al crear: la
  especialista suele registrar visitas de días anteriores y un "hoy" precargado induce a
  error (decisión de Claude).
- **Validación en cliente**: al salir de cada campo (blur) y al enviar. Al enviar con
  errores, el foco va al primer campo con error. Los errores se muestran debajo del campo,
  en el color de error y con icono, nunca solo con color.
- **Errores del servidor**: se pintan en el campo correspondiente. Los que no son de un
  campo (`non_field_errors`) van en un aviso encima del formulario.
- **Envío**: el botón se deshabilita y muestra "Guardando…" mientras la petición está en
  curso, para evitar envíos dobles.
- **Al guardar**: crear lleva al detalle de la nueva visita con el aviso "Visita
  registrada". Editar vuelve al detalle con "Cambios guardados".
- **Cancelar / Volver**: crear vuelve al listado y editar vuelve al detalle. No se pide
  confirmación por cambios sin guardar (fuera de alcance; anotado como mejora).
- **Editar**: el formulario se precarga con la visita, incluido su docente. Título
  "Editar visita"; botón "Guardar cambios".

#### 4. Detalle (`/visitas/[id]`)

```
  ← Volver a visitas
  Visita del 12 nov 2026                         ◖Visita en aula◗
  ─────────────────────────────────────────────────────────────
  Colegio            U.E. Los Samanes
  Docente visitado   Ana Pérez
  Fecha              jueves, 12 de noviembre de 2026
  Tipo               Visita en aula
  Observaciones
     La docente organizó el trabajo en estaciones...
     (respeta los saltos de línea)

  Registrada el 12 nov 2026 · Última edición el 13 nov 2026

  ( Editar )   Eliminar visita
```

- "Volver a visitas" regresa al listado **con los filtros que tenía** (se pasan por la
  query string al navegar).
- **Eliminar**: abre un diálogo de confirmación (`<dialog>` nativo, accesible, con foco
  atrapado): "¿Eliminar esta visita? Dejará de aparecer en el listado." Botones
  "Eliminar visita" (rojo) y "Cancelar" (foco inicial en Cancelar). Al confirmar, vuelve al
  listado con el aviso "Visita eliminada".
- La línea "Registrada el… · Última edición el…" solo muestra la edición si existe.

#### 5. No encontrada

Si el ID no existe, no es un número o la visita fue eliminada: "Esta visita no existe o
fue eliminada." + "Volver a visitas". La misma pantalla se usa en `/visitas/[id]` y en
`/visitas/[id]/editar`. No se distingue entre "nunca existió" y "eliminada", de forma
coherente con el borrado lógico.

### Casos borde y reglas

**Fechas y zona horaria**
- Se acepta hoy y cualquier día anterior. Se rechaza mañana o después con "La fecha de la
  visita no puede ser posterior a hoy."
- "Hoy" se calcula en el backend con `TIME_ZONE` (`America/Caracas`). Si el navegador
  está en otra zona y su "hoy" difiere, prevalece el backend y el error llega como error
  del campo fecha.
- **Límite inferior (decisión de Claude):** no se aceptan fechas anteriores al
  2000-01-01 ("Revisa la fecha: parece demasiado antigua."). Así se atrapan errores de
  tecleo como "0202" sin imponer una regla de negocio inventada.
- Fecha con formato inválido o vacía: "Indica la fecha de la visita."

**Colegio y docente**
- Docente que no pertenece al colegio: 400, error en `teacher`: "Este docente no pertenece
  al colegio seleccionado."
- Colegio o docente inexistente (ID que no existe): 400 con el error estándar de DRF en ese
  campo, traducido ("El colegio seleccionado no existe.").
- **Editar una visita antigua cuyo docente cambió de colegio:** la coherencia
  colegio-docente **solo se valida si en esa edición cambia `school` o `teacher`**. Si
  solo se corrigen las observaciones o la fecha, la visita histórica se puede guardar
  aunque el docente ya esté en otro colegio. En el formulario de edición, el select de
  docente incluye siempre al docente actual de la visita aunque ya no figure en la lista
  del colegio. Esto completa la decisión de guardar el colegio en la visita.
- Colegios y docentes no se pueden borrar si tienen visitas (`PROTECT`). Desde la app no
  hay forma de borrarlos; aplica solo al admin.

**Texto de observaciones**
- Obligatorio. Se recortan los espacios al inicio y al final antes de guardar; si queda
  vacío: "Escribe las observaciones de la visita."
- Máximo 5000 caracteres (decisión de Claude: una planilla extensa cabe de sobra, y el
  límite evita abusos). El contador se ve en el formulario. Se conservan los saltos de
  línea.

**Tipo de visita**
- Solo `CLASSROOM` o `MEETING`. Otro valor: "Elige un tipo de visita válido."

**Duplicados**
- Se permiten dos visitas con el mismo colegio, docente, fecha y tipo (decisión de Claude:
  una especialista puede ver a la misma docente dos veces el mismo día). No hay aviso de
  duplicado; se anota como mejora.

**Borrado lógico**
- Eliminar una visita ya eliminada, o editarla desde otra pestaña después de eliminarla:
  404, y el frontend muestra la pantalla "no encontrada".
- Eliminar no toca `updated_at` de forma visible en la UI; queda en `deleted_at`.
- No hay "deshacer" en la UI; se puede restaurar desde el admin poniendo `is_deleted` en
  falso (documentado en el README).

**Filtros**
- `school` y `visit_type` se combinan con Y (AND).
- `school` con un ID inexistente o no numérico: 400 desde la API. El frontend nunca lo
  envía, porque limpia los filtros inválidos de la URL (ver Listado).
- Las visitas eliminadas nunca aparecen, con o sin filtros.

**Concurrencia**
- Dos personas editando la misma visita: gana la última que guarda (sin bloqueo
  optimista; anotado como mejora).

**Mensajes de error**
- Todos los mensajes de validación de la API están en español (`LANGUAGE_CODE = "es"` más
  mensajes propios en el serializer), para que el frontend los muestre tal cual.

### Estructura e infraestructura

```
prueba-tecnica/
  backend/      proyecto uv (pyproject.toml, uv.lock) + Dockerfile — ver diseño del backend
  frontend/     proyecto npm (package.json, package-lock.json) + Dockerfile — ver diseño del frontend
  docs/         specs, plan, ai-log.md
  docker-compose.yml   db (postgres:16) · backend (:8000) · frontend (:3000)
  Makefile · .pre-commit-config.yaml · .env.example · README.md
```

**Un solo repo, dos apps, sin herramientas de monorepo** (decisión de Claude, aceptada
por el usuario):
- Un repo, porque la entrega pide un solo enlace: el evaluador clona una vez y ejecuta
  `make up`.
- Sin Turborepo, Nx ni workspaces: esas herramientas sirven cuando varios paquetes JS
  comparten código. Aquí son dos apps en dos lenguajes, y lo único que comparten es el
  contrato OpenAPI, que ya resuelve `make types`.
- Cada app es autocontenida, con sus propias dependencias, configuración de lint y
  Dockerfile. Cualquiera de las dos carpetas podría pasar a su propio repo sin desenredar
  nada.
- El `Makefile` de la raíz es el punto de entrada único: `make up`, `make down`,
  `make test` (pytest), `make e2e`, `make lint`, `make types` (regenera los tipos del
  frontend desde el schema) y `make seed`. `pre-commit` ejecuta ruff, ruff-format,
  prettier y eslint.

- `docker compose up` (o `make up`) → la app queda en `http://localhost:3000`, Swagger en
  `http://localhost:8000/api/docs/` y el admin en `http://localhost:8000/admin/`.
- El destino del proxy se configura por variable de entorno (`http://backend:8000` dentro
  de Docker, `http://localhost:8000` fuera).
- Se esperan dos modos de ejecución documentados: con Docker (el principal) y nativo
  (Postgres + `uv sync` + `npm install`) como alternativa.

### Pruebas

**Backend** con `pytest` + `pytest-django` + `factory-boy`, organizado por capa:
- `test_services.py`: las reglas de negocio, probadas directamente sobre los servicios.
- `test_selectors.py`: filtros y exclusión de las visitas eliminadas.
- `test_apis.py`: el contrato HTTP (códigos 201/200/204/400/404 y formato de errores) con
  `APIClient`.

Casos que deben cubrirse:
- rechazo de fecha futura y aceptación de la fecha de hoy;
- campos obligatorios ausentes o vacíos;
- docente que no pertenece al colegio, y edición de una visita histórica cuyo docente
  cambió de colegio (se guarda si solo cambian fecha u observaciones);
- fecha anterior a 2000-01-01; observaciones solo con espacios o de más de 5000 caracteres;
- el borrado lógico excluye la visita del listado, devuelve 404 en el detalle y el
  registro sigue en la base de datos;
- filtros por colegio y por tipo.

**Frontend**: lint + `tsc --noEmit`, sin tests unitarios.

**E2E versionados con `@playwright/test`** (usuario), en `frontend/e2e/`, contra el stack
levantado con Docker (`make e2e`; Playwright arranca con `webServer` o asume
`http://localhost:3000`). Flujos:
1. Registrar una visita válida → aparece en el detalle con el aviso "Visita registrada" y
   en el listado.
2. Filtrar por colegio y por tipo → solo se ven las visitas que coinciden; la URL refleja
   los filtros; "Limpiar filtros" los quita.
3. Editar una visita → "Cambios guardados" y el detalle muestra el cambio.
4. Eliminar una visita con confirmación → desaparece del listado; abrir su URL muestra
   "Esta visita no existe o fue eliminada."
5. Validaciones: enviar el formulario vacío muestra los errores por campo; una fecha futura
   muestra el error de fecha; al cambiar de colegio se limpia el docente.

Para que los E2E sean repetibles, cada test crea sus propios datos con nombres únicos
(observaciones con marca de tiempo) y no depende de las visitas de ejemplo.

**Antes de entregar** (fuera de la suite):
- Auditar la interfaz con el skill `web-design-guidelines` y corregir lo que salga.
- Una pasada exploratoria con el skill `webapp-testing` en móvil (375 px) y escritorio.

### Registro de uso de IA

(Decisión del usuario.) Durante el desarrollo, Claude mantiene `docs/ai-log.md` y añade
una entrada por cada tarea del plan: qué generó la IA, qué revisó el autor y qué corrigió
o rechazó. Las correcciones que el autor pida en la conversación se anotan como tales.
Al final, Claude redacta la sección «Uso de inteligencia artificial» del README a partir
de la bitácora, y el autor la revisa y ajusta antes de entregar. El plan debe incluir ese
paso de revisión antes del lunes 23 a las 12:00.

## Queda a criterio del implementador

- Ajustes finos del diseño visual dentro de la dirección descrita arriba.
- Nombres de colegios y docentes ficticios con sabor venezolano ("U.E.", "Colegio"…),
  sin parecerse a instituciones reales.
- Nombres internos, organización de componentes y versiones exactas de dependencias
  (estables y actuales).
- Contenido ficticio del fixture.
- Detalles del proxy: barras finales frente a `APPEND_SLASH`, y si la variable del destino
  hace falta al compilar o solo al ejecutar.

