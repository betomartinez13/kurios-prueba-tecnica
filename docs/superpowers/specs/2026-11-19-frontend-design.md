# Registro de visitas — Diseño del frontend

Complementa a [`2026-11-19-registro-visitas-design.md`](2026-11-19-registro-visitas-design.md) (el documento principal: qué se construye, contrato de la API, pantallas, flujos y casos borde). Este documento describe **cómo** se construye el frontend y cómo se ve.

## Base: Next.js 16.3 o superior, App Router, TypeScript

Se fija Next.js 16.3+ porque desde esa versión `next dev` genera `AGENTS.md`/`CLAUDE.md`
con las buenas prácticas oficiales de Vercel (el antiguo skill `next-best-practices` ya
no existe), y el implementador debe seguirlas.

## Cómo se construye el estilo

**SASS modules + variables CSS**, sin kit de UI y sin Tailwind:

- **Tokens** en `styles/_tokens.scss`: los colores, radios, sombras y escala tipográfica de
  Kurios (ver "Dirección visual") se declaran como variables CSS en `:root`. Una capa fina
  de SASS añade unos pocos mixins (`focus-ring`, `card`, `breakpoint(md)`) en
  `styles/_mixins.scss`.
- **Estilos por componente**: cada componente tiene su `Componente.module.scss` (CSS
  Modules, integrados en Next). Las clases quedan aisladas por componente y los
  componentes solo leen variables de los tokens; ningún color ni medida va escrito
  directamente en un componente.
- **Fuente**: Lexend con `next/font/google`, alojada en el propio build y sin saltos de
  diseño al cargar.
- **Primitivas nativas** siempre que se pueda: `<dialog>` para la confirmación,
  `<input type="date">`, radio buttons y `<select>`. Solo `sonner` para los avisos,
  estilado con los tokens.
- **Iconos** con `lucide-react` (usuario), importados de uno en uno para que el build solo
  incluya los que se usan: flecha de volver, chevrons, icono de error junto a los mensajes,
  cerrar en los avisos. Con `aria-hidden` cuando acompañan a un texto.
- **Por qué no Tailwind**: el perfil del puesto pide CSS y SASS, así que SASS demuestra
  esa habilidad. Además, Kurios ya usa variables CSS, y sus tokens se copian 1:1 de forma
  más natural. CSS-in-JS se descarta porque choca con los Server Components.

## Paquetes

**Frontend** (Node 22 LTS, `npm`)

| Paquete | Uso |
|---|---|
| `next` ≥ 16.3, `react`, `typescript`, `sass` | Base |
| `@tanstack/react-query` | Caché del estado del servidor, carga/error, invalidación después de mutar |
| `react-hook-form`, `zod`, `@hookform/resolvers` | Formulario declarativo y esquema de validación |
| `openapi-typescript` (dev), `openapi-fetch` | Tipos y cliente generados del schema de Django (usuario) |
| `nuqs` | Filtros del listado sincronizados con la URL, con tipos |
| `sonner` | Avisos (toasts) |
| `lucide-react` | Iconos, importados de uno en uno (usuario) |
| `@playwright/test` (dev) | Tests E2E (usuario) |
| ESLint (config de Next), Prettier (dev) | Revisión de estilo y formato |

Descartado: date-fns (basta con `Intl.DateTimeFormat("es-VE")`), Radix u otras librerías de
componentes (basta con el `<dialog>` nativo), y Redux o Zustand (el único estado global es
el del servidor, que lleva TanStack Query).

## Arquitectura (patrones)

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
    _mixins.scss               focus-ring, card, breakpoint
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

## Dirección visual: alineada con kuriosedu.com

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
