# Registro de visitas a colegios — Diseño

Fecha: 2026-11-19 · Entrega: lunes 2026-11-23, 12:00 (mediodía)

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
- `TIME_ZONE` se configura por variable de entorno, con `America/Bogota` como valor por
  defecto (decisión de Claude). En el frontend, el input de fecha usa `max` = hoy en la
  hora local del navegador como ayuda de UX. La regla que manda es la del backend.

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
- `VisitViewSet` (`ModelViewSet`) con `select_related("school", "teacher")` en el
  queryset, para evitar consultas N+1 al serializar los nombres. Colegios y docentes
  son `ReadOnlyModelViewSet`.
- `destroy()` se sobrescribe para hacer el borrado lógico (un método `soft_delete()` en el
  modelo) en vez de `instance.delete()`.
- Permisos: `AllowAny` declarado **explícitamente** en settings de DRF, con un comentario
  de que la app no tiene autenticación por alcance. Se anota en el README como lo primero
  a añadir en una siguiente iteración.
- La validación de coherencia colegio-docente va en `VisitSerializer.validate()` (a nivel
  de objeto) y el error se asigna al campo `teacher`, para que el frontend lo pinte junto
  al select de docente.
- Configuración por variables de entorno (`SECRET_KEY`, `DEBUG`, `DATABASE_URL` o sus
  partes, `TIME_ZONE`, credenciales del superusuario de demo), con un `.env.example`
  versionado. Ningún secreto queda en `settings.py`.
- Sin paginación (fuera de alcance; se menciona como mejora).
- Los errores siguen el formato estándar de DRF (`{campo: [mensajes]}`), y el frontend los
  muestra junto a cada campo.

### Frontend (Next.js 16.3 o superior, App Router, TypeScript, SASS modules)

Se fija Next.js 16.3+ porque desde esa versión `next dev` genera `AGENTS.md`/`CLAUDE.md`
con las buenas prácticas oficiales de Vercel (el antiguo skill `next-best-practices` ya
no existe), y el implementador debe seguirlas.

Páginas:
- `/` → listado de visitas con dos selects de filtro (colegio, tipo) sincronizados con la
  query string de la URL. Botón "Nueva visita". Estado vacío y estado de carga.
- `/visitas/nueva` → formulario de creación.
- `/visitas/[id]` → detalle, con botones "Editar" y "Eliminar" (con confirmación). Tras
  eliminar, vuelve al listado.
- `/visitas/[id]/editar` → el mismo componente de formulario, precargado.

Formulario: al elegir un colegio se cargan solo sus docentes, y si se cambia el colegio el
docente se limpia. La validación en cliente cubre lo básico (campos requeridos, fecha no
futura) y los errores del backend se muestran por campo.

Una pequeña capa `lib/api.ts` con funciones tipadas (`listVisits`, `getVisit`, `createVisit`, …)
y tipos compartidos en `lib/types.ts`.

### Dirección visual (propuesta de Claude, con el skill frontend-design)

Tema: la **planilla de campo** de una especialista. Es una herramienta de trabajo que se
consulta y se llena varias veces por semana, así que la prioridad es leer rápido y no
equivocarse al registrar. Sobria, sin librerías de componentes y sin animaciones
decorativas.

- **Color** (5 tokens en variables SASS/CSS):
  - `tinta` #1E3448 (texto y acciones principales, un azul pizarra);
  - `papel` #FFFFFF (superficie);
  - `fondo` #EEF1F3 (lienzo gris frío, no crema);
  - `aula` #2F6B4F (verde) y `encuentro` #8A4B9B (ciruela): son el único color con
    significado y distinguen el tipo de visita de un vistazo en el listado;
  - `error` #B3261E.
  El contraste de texto es AA como mínimo.
- **Tipografía**: una sola familia, *Atkinson Hyperlegible*, diseñada para máxima
  legibilidad y coherente con un contexto educativo. Cargada con `next/font`. Escala corta:
  14 / 16 / 20 / 28 px. Etiquetas en minúscula normal, sin versalitas ni mayúsculas.
- **Layout**: columna centrada de unos 960 px de ancho máximo, texto alineado a la izquierda.
  El listado es una **tabla** (fecha · colegio · docente · tipo), no tarjetas, porque son
  datos para comparar en filas. Por debajo de unos 640 px cada fila se apila en un bloque
  de dos líneas.

  ```
  Visitas registradas                       [ Registrar visita ]
  Colegio [ Todos ▾ ]   Tipo [ Todos ▾ ]    Limpiar filtros
  ─────────────────────────────────────────────────────────────
  12 nov 2026   Colegio Los Robles   Ana Pérez     ● Visita en aula
  05 nov 2026   Colegio El Prado     Luis Gómez    ● Encuentro
  ```
  Cada fila entera es un enlace al detalle. El detalle muestra los campos como una lista
  de definiciones, y las observaciones con su formato de párrafos.
- **Lo memorable**: la marca de color por tipo de visita. Todo lo demás se mantiene quieto.
- **Calidad base**: foco de teclado visible, `<label>` asociado a cada campo, errores
  enlazados con `aria-describedby`, respeto de `prefers-reduced-motion` y funcionamiento
  correcto en móvil.

**Textos** (en español, en voz activa y diciendo lo que hacen):
- Botones: "Registrar visita", "Guardar cambios", "Editar", "Eliminar visita", "Cancelar".
- La confirmación del borrado dice qué pasa: "¿Eliminar esta visita? Dejará de aparecer
  en el listado."
- Estado vacío: "Todavía no hay visitas registradas." con el botón "Registrar visita".
  Con filtros activos: "No hay visitas que coincidan con estos filtros." con "Limpiar filtros".
- Error de red: "No se pudo conectar con el servidor. Revisa que el backend esté en marcha
  y vuelve a intentarlo." con un botón "Reintentar".
- Fecha futura: "La fecha de la visita no puede ser posterior a hoy."

### Datos iniciales

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

### Estructura e infraestructura

```
backend/        Django project (config/) + app visits/
frontend/       Next.js app
docker-compose.yml   db (postgres:16) · backend (:8000) · frontend (:3000)
README.md
```

- `docker compose up` → la app queda en `http://localhost:3000`.
- El destino del proxy se configura por variable de entorno (`http://backend:8000` dentro
  de Docker, `http://localhost:8000` fuera).
- Se esperan dos modos de ejecución documentados: con Docker (el principal) y nativo
  (Postgres + venv + npm) como alternativa.

### Pruebas

Tests de backend con `APITestCase` de DRF (los fixtures o el `setUpTestData` crean
colegios y docentes) para la lógica que importa:
- rechazo de fecha futura y aceptación de la fecha de hoy;
- campos obligatorios ausentes o vacíos;
- docente que no pertenece al colegio;
- el borrado lógico excluye la visita del listado, devuelve 404 en el detalle y el
  registro sigue en la base de datos;
- filtros por colegio y por tipo.

Frontend: lint + `tsc --noEmit`, sin tests unitarios (se declara en el README).

Verificación antes de entregar (no forma parte de la suite entregada):
- Recorrer los flujos de la UI con Playwright usando el skill `webapp-testing`: crear,
  filtrar, ver detalle, editar, eliminar, rechazo de fecha futura y error de docente de
  otro colegio. Antes hay que instalar Playwright (`pip install playwright`).
- Auditar la interfaz con el skill `web-design-guidelines` cuando el frontend exista, y
  corregir lo que salga.

### Registro de uso de IA

(Decisión del usuario.) Durante el desarrollo, Claude mantiene `docs/ai-log.md` y añade
una entrada por cada tarea del plan: qué generó la IA, qué revisó el autor y qué corrigió
o rechazó. Las correcciones que el autor pida en la conversación se anotan como tales.
Al final, Claude redacta la sección «Uso de inteligencia artificial» del README a partir
de la bitácora, y el autor la revisa y ajusta antes de entregar. El plan debe incluir ese
paso de revisión antes del lunes 23 a las 12:00.

## Queda a criterio del implementador

- Ajustes finos del diseño visual dentro de la dirección descrita arriba.
- Nombres internos, organización de componentes y versiones exactas de dependencias
  (estables y actuales).
- Contenido ficticio del fixture.
- Detalles del proxy: barras finales frente a `APPEND_SLASH`, y si la variable del destino
  hace falta al compilar o solo al ejecutar.
