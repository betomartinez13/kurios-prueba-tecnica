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
- `VisitViewSet` (`ViewSet` con las acciones `list`, `retrieve`, `create`, `update`,
  `partial_update` y `destroy`) **delega en la capa de servicios y selectors** (ver
  "Arquitectura del backend"). No hereda de `ModelViewSet` porque la lógica de escritura
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
- Sin paginación (fuera de alcance; se menciona como mejora).
- Los errores siguen el formato estándar de DRF (`{campo: [mensajes]}`), y el frontend los
  muestra junto a cada campo.

### Frontend (Next.js 16.3 o superior, App Router, TypeScript, SASS modules)

Se fija Next.js 16.3+ porque desde esa versión `next dev` genera `AGENTS.md`/`CLAUDE.md`
con las buenas prácticas oficiales de Vercel (el antiguo skill `next-best-practices` ya
no existe), y el implementador debe seguirlas.

La arquitectura del frontend (cliente de API generado, hooks, formularios) está en
"Arquitectura del frontend", más abajo.

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
- **Barra superior flotante** (ver Dirección visual) con el símbolo "k" de Kurios, el
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

### Dirección visual: alineada con kuriosedu.com

El usuario pidió que la app se parezca lo más posible a la web de Kurios. Los valores
siguientes se tomaron de la hoja de estilos pública de kuriosedu.com
(`/assets/index-*.css`) y de los estilos computados de la página de inicio y de
`/schools`, abiertas con Playwright el 2026-11-19 a 1440 px de ancho.

Lo observado en el sitio y que la app replica:
- **Barra de navegación flotante**: una "píldora" blanca separada de los bordes (unos
  80 px a cada lado a 1440 px, 28 px desde arriba, 71 px de alto), con fondo
  `rgba(255,255,255,.85)`, esquinas redondeadas de unos 24 px y sombra
  `0 10px 30px rgba(31,20,56,.12)`. A la izquierda va el **símbolo "k"** morado (el PNG del
  logo, de unos 22×30 px); a la derecha, botones compactos. El enlace activo va en
  `--kurios-morado-claro` y subrayado con una línea de 2 px.
- **Fondo de página** lavanda `--kurios-cream` #F7F5FB, con contenido en tarjetas blancas.
- **Títulos de sección** grandes, en peso 500, color `--kurios-morado-claro` #685BC7 e
  interletrado ligeramente negativo.
- **Botones** con esquinas de **13 px** (no píldora): primario relleno `--kurios-morado`
  con texto blanco y peso 500, padding 8–15 px × 16–28 px. Hay un secundario de acento en
  `--kurios-azul` #00A3E0 y uno blanco con texto morado.
- **Tarjetas y paneles** blancos con borde 1 px `--kurios-line` #E3DFEC, esquinas de
  14–20 px y casi sin sombra.
- **Pie** con degradado morado oscuro (#3A0D8C → #1F0050 aprox.) y textos blancos pequeños.
- El sitio no tiene tablas ni formularios visibles en esas páginas, así que la tabla y el
  formulario de la app se diseñan con esos mismos tokens (propuesta de Claude).

- **Color** (tokens del sitio, con sus nombres originales):
  - `--kurios-morado` #330072: barra superior, botón primario, enlaces;
  - `--kurios-morado-claro` #685BC7: hover de botones y enlaces;
  - `--kurios-morado-05` #F2EEF8 y `--kurios-cream` #F7F5FB: fondo de página y
    estados hover de filas;
  - `--kurios-ink` #1F1438: texto principal; `--kurios-slate` #4A3F66: texto secundario;
    `--kurios-mute` #8B82A6: textos de ayuda (solo sobre blanco, tamaño ≥ 14 px);
  - `--kurios-line` #E3DFEC: bordes y divisores;
  - Tipo de visita, los dos únicos colores con significado: **Visita en aula** =
    `--kurios-azul` #00A3E0 (punto) sobre `--kurios-azul-10` #D9F1FA; **Encuentro** =
    `--kurios-naranja` #F06400 sobre `--kurios-naranja-10` #FCE0CC. El texto de la etiqueta
    va en `--kurios-ink` para cumplir AA; el color de marca va en el punto y en el fondo.
  - Éxito (avisos): `--kurios-verde` #43B02A como acento. Error: #B42318 (un rojo más oscuro
    que el `--accent-red` del sitio, porque ese no alcanza AA como texto sobre blanco).
- **Tipografía**: la web usa *Soho Gothic Pro* (comercial, con licencia de Monotype) para
  titulares y texto, y *Lexend* como fuente secundaria. La app usa **Lexend** (libre, en
  Google Fonts, cargada con `next/font/google`) en pesos 400 y 500 para todo. No se copia
  ni redistribuye Soho Gothic Pro desde el sitio, por licencia. Escala: 13 / 15 / 18 /
  24 / 32 px (15 y 13 son los tamaños de cuerpo del sitio).
- **Formas**: botones y campos con esquinas de 13 px como en el sitio; contenedor de la
  tabla, del detalle y del formulario como tarjeta blanca con borde `--kurios-line` y
  esquinas de 20 px, casi sin sombra. La única sombra marcada es la de la barra flotante.
- **Botones**: primario relleno `--kurios-morado` con texto blanco (hover
  `--kurios-morado-claro`); secundario blanco con texto morado y borde `--kurios-line`;
  peligro rojo. Altura mínima de 44 px en la app (algo más que los 39 px del sitio, para
  uso táctil).
- **Barra superior**: réplica de la barra flotante del sitio: una píldora blanca
  translúcida con sombra, con el **símbolo "k" oficial de Kurios** a la izquierda
  (decisión del usuario; es el PNG que publica el sitio en
  `https://www.kuriosedu.com/media/49001efef4d1.png`, guardado en `frontend/public/` y
  servido con `next/image`). Le siguen el texto "Registro de visitas" en ink 500 y, como
  único enlace de navegación, "Visitas" (activo, en morado claro y subrayado). A la
  derecha, el botón primario "Registrar visita". En móvil la píldora ocupa el ancho con
  16 px de margen y el botón pasa a ser solo el texto corto "Registrar".
- **Títulos de página** ("Visitas", "Registrar visita", "Visita del 12 nov 2026") en
  `--kurios-morado-claro`, peso 500, 32 px e interletrado -0.5 px, como los títulos de
  sección del sitio pero a escala de herramienta.
- **Pie** discreto: una franja con el mismo degradado morado del sitio y una sola línea
  "Kurios Education · Registro de visitas", para que la app se sienta parte de la marca sin
  ocupar pantalla.
- **Tono de los textos**: el sitio tutea ("Descubre tu pasión"); la app también tutea
  ("Selecciona un colegio", "Escribe las observaciones").
- **Calidad base**: foco visible (anillo de 2 px en `--kurios-morado-claro`), `<label>`
  en cada campo, errores enlazados con `aria-describedby`, `prefers-reduced-motion`
  respetado y funcionamiento correcto en móvil. Contraste AA en todo el texto.

**Textos** (en español, tuteando, en voz activa y diciendo lo que hacen):
- Botones: "Registrar visita", "Guardar cambios", "Editar", "Eliminar visita", "Cancelar",
  "Reintentar", "Limpiar filtros".
- Los avisos repiten el verbo del botón: "Visita registrada", "Cambios guardados",
  "Visita eliminada".
- Los mensajes de vacío, error y validación son los que figuran en "Pantallas y flujos" y
  "Casos borde".

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

### Paquetes

Criterio: cada paquete debe **quitar código propio**, no añadir piezas. Las decisiones
marcadas "(usuario)" las tomó el usuario; el resto son propuestas de Claude que el usuario
vio en la lista de paquetes.

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

**Frontend** (Node 22 LTS, `npm`)

| Paquete | Uso |
|---|---|
| `next` ≥ 16.3, `react`, `typescript`, `sass` | Base |
| `@tanstack/react-query` | Caché del estado del servidor, carga/error, invalidación después de mutar |
| `react-hook-form`, `zod`, `@hookform/resolvers` | Formulario declarativo y esquema de validación |
| `openapi-typescript` (dev), `openapi-fetch` | Tipos y cliente generados del schema de Django (usuario) |
| `nuqs` | Filtros del listado sincronizados con la URL, con tipos |
| `sonner` | Avisos (toasts) |
| `@playwright/test` (dev) | Tests E2E (usuario) |
| ESLint (config de Next), Prettier (dev) | Revisión de estilo y formato |

Descartado: date-fns (basta con `Intl.DateTimeFormat("es-VE")`), Radix u otras librerías de
componentes (basta con el `<dialog>` nativo), y Redux o Zustand (el único estado global es
el del servidor, que lleva TanStack Query).

**Repo**: `pre-commit` (ruff, ruff-format, prettier, eslint) y un `Makefile` como punto de
entrada único: `make up`, `make down`, `make test` (pytest), `make e2e`, `make lint`,
`make types` (regenera los tipos del frontend desde el schema) y `make seed`.

### Arquitectura del backend (patrones; usuario: services + selectors)

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

### Arquitectura del frontend (patrones)

```
frontend/
  app/
    layout.tsx                 fuente Lexend, Providers, barra flotante, pie, Toaster
    providers.tsx              QueryClientProvider + NuqsAdapter
    page.tsx                   Listado (contenedor)
    visitas/nueva/page.tsx     Crear (contenedor)
    visitas/[id]/page.tsx      Detalle (contenedor)
    visitas/[id]/editar/page.tsx
  components/                  presentacionales, cada uno con su .module.scss
    NavBar, Footer, VisitTable, VisitFilters, VisitForm, VisitDetail,
    TypeBadge, ConfirmDialog, EmptyState, ErrorState, NotFound, Button
  lib/
    api/schema.d.ts            GENERADO por openapi-typescript (no se edita)
    api/client.ts              openapi-fetch + normalización de errores
    api/errors.ts              ApiError y normalizeError()
    queries/visits.ts          hooks de TanStack Query
    queries/catalog.ts         useSchools, useTeachers(schoolId)
    forms/visitSchema.ts       esquema Zod del formulario
    format.ts                  formateo de fechas con Intl
  styles/
    _tokens.scss               tokens de Kurios (colores, radios, sombras, tipografía)
    globals.scss
  e2e/                         tests de Playwright
```

Patrones y responsabilidades:

- **Contrato generado (OpenAPI → TypeScript)**: `make types` descarga `/api/schema/` y
  ejecuta `openapi-typescript` para generar `lib/api/schema.d.ts`, que se versiona. Ningún
  tipo de la API se escribe a mano. Si el backend cambia y el frontend no, `tsc` falla.
- **Adapter / API Gateway** (`lib/api/client.ts`): el único módulo que habla HTTP. Usa
  `openapi-fetch` con `baseUrl: "/api"`, que el proxy de Next reenvía a Django. Normaliza
  todo error en `ApiError` con
  `kind: "validation" | "not_found" | "network" | "server"` y `fields` para los errores de
  validación.
- **Custom hooks sobre TanStack Query** (`lib/queries`): `useVisits(filters)`,
  `useVisit(id)`, `useCreateVisit()`, `useUpdateVisit(id)`, `useDeleteVisit()`,
  `useSchools()`, `useTeachers(schoolId)`. Las claves de caché salen de una fábrica única
  (`visitKeys.list(filters)`, `visitKeys.detail(id)`), y cada mutación invalida las claves
  que afecta. Las páginas nunca llaman a `fetch` ni conocen las claves.
- **Container / Presentational**: las páginas de `app/` componen hooks, deciden el estado
  (carga, vacío, error, no encontrada) y pasan datos a componentes presentacionales, que no
  hacen peticiones y se pueden probar o reutilizar solos. `VisitForm` lo usan tanto crear
  como editar, y recibe `defaultValues`, `onSubmit` y `serverErrors`.
- **Esquema como fuente de verdad del formulario** (`visitSchema.ts`): Zod declara los
  requeridos, la fecha (no futura ni anterior a 2000), las observaciones (sin espacios
  sobrantes, máximo 5000) y el tipo. React Hook Form lo usa con `zodResolver`. Los errores
  del servidor se aplican con `setError` campo a campo, y el foco va al primer error.
- **Estado en la URL** (`nuqs`): `school` y `visit_type` como parámetros de búsqueda con
  tipos y valores por defecto. Un valor inválido se descarta y se limpia de la URL.
- **Design tokens** (`_tokens.scss`): todos los valores de Kurios están definidos como
  variables CSS en un único archivo, y los componentes solo usan esas variables.

Lo que se descarta a propósito: estado global (Redux/Zustand), Server Actions (enfoque
descartado) y librerías de componentes.

### Estructura e infraestructura

```
backend/        Django (ver Arquitectura del backend), pyproject.toml + uv.lock
frontend/       Next.js (ver Arquitectura del frontend)
docker-compose.yml   db (postgres:16) · backend (:8000) · frontend (:3000)
Makefile · .pre-commit-config.yaml · .env.example · README.md
```

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
