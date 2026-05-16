# Design System — Cancionero Arquidiocesano Digital

## Este documento invalida la sección de diseño gráfico de `especificacion_tecnica.md` (5.3 Requerimientos de diseño y 10. UX/UI y Diseño Gráfico), y asigna los lineamientos generales a la sección de diseño gráfico a usar en el proyecto.

## Tipografía

**Fuente principal:** *Cardo* (Google Fonts).

La escala tipográfica está basada en las utilidades de Tailwind CSS y sigue una progresión consistente:

| Clase Tailwind | Tamaño            | Line Height       | Uso principal                                                                  | Ejemplos                                                       |
|----------------|-------------------|-------------------|--------------------------------------------------------------------------------|----------------------------------------------------------------|
| `text-xs`      | 12px (0.75rem)    | 16px (1rem)       | Badges, metadata, autores, etiquetas muy pequeñas                              | Status badges, metadata de tablas, autores                     |
| `text-sm`      | 14px (0.875rem)   | 20px (1.25rem)    | TAMAÑO MÁS COMÚN — botones, labels, tablas, tooltips, contenido general        | Todos los botones, form labels, celdas de tabla, navegación   |
| `text-base`    | 16px (1rem)       | 24px (1.5rem)     | Texto por defecto, descripciones, inputs                                       | Texto de párrafo, form inputs                                  |
| `text-lg`      | 18px (1.125rem)   | 28px (1.75rem)    | Títulos de diálogos, headers de alertas                                        | Títulos de modales, alert dialogs                              |
| `text-xl`      | 20px (1.25rem)    | 28px (1.75rem)    | Subtítulos prominentes                                                         | Subtítulos de sección                                          |
| `text-2xl`     | 24px (1.5rem)     | 32px (2rem)       | Headers de sección                                                             | Títulos de página                                              |
| `text-3xl`     | 30px (1.875rem)   | 36px (2.25rem)    | Títulos principales de páginas, hero text                                      | Headers de página, banners de bienvenida                       |


## Paleta de colores

Valores actuales tomados de [`app/globals.css`](../app/globals.css). Paleta aprobada en fase 2 (2026-05).

### Tema Light (por defecto)

| Token (Tailwind)   | Hex       | Muestra                                                            | Uso                                                                       |
|--------------------|-----------|--------------------------------------------------------------------|---------------------------------------------------------------------------|
| `background`       | `#eaf0fa` | ![#eaf0fa](https://placehold.co/16x16/eaf0fa/eaf0fa.png)           | Fondo general de toda la app                                              |
| `sidebar`          | `#bfd0ea` | ![#bfd0ea](https://placehold.co/16x16/bfd0ea/bfd0ea.png)           | Encabezado, pie y barra de menú de acciones de la vista de canción       |
| `primary`          | `#1f3f73` | ![#1f3f73](https://placehold.co/16x16/1f3f73/1f3f73.png)           | Iconos y botones (acción principal). Clases: `bg-primary`, `text-primary`, `border-primary`. |
| `primary-hover`    | `#16305a` | ![#16305a](https://placehold.co/16x16/16305a/16305a.png)           | Hover de iconos y botones                                                 |
| `page-title`       | `#436baf` | ![#436baf](https://placehold.co/16x16/436baf/436baf.png)           | Títulos de páginas. Clase: `text-page-title`.                             |
| `shortcut`         | `#6f91c7` | ![#6f91c7](https://placehold.co/16x16/6f91c7/6f91c7.png)           | Atajos / categorías destacadas (ej. botones de categoría de cantos en la home). Clases: `bg-shortcut`, `border-shortcut`, `text-shortcut`. |
| `song-title`       | `#8b1a1a` | ![#8b1a1a](https://placehold.co/16x16/8b1a1a/8b1a1a.png)           | Títulos de canciones, de tarjetas y de playlists. Clases: `text-song-title`, `border-song-title`. También el corazón de favoritos. |
| `secondary`        | `#b49a55` | ![#b49a55](https://placehold.co/16x16/b49a55/b49a55.png)           | Acentos, subtítulos, número y categorías en vista de canción              |
| `foreground`       | `#30343b` | ![#30343b](https://placehold.co/16x16/30343b/30343b.png)           | Texto normal                                                              |
| `card`             | `#ffffff` | ![#ffffff](https://placehold.co/16x16/ffffff/ffffff.png)           | Fondo de tarjetas. Clase: `bg-card`.                                      |
| `muted-foreground` | `#5b6473` | ![#5b6473](https://placehold.co/16x16/5b6473/5b6473.png)           | Texto secundario, metadata                                                |
| `border`           | `#c5d2e6` | ![#c5d2e6](https://placehold.co/16x16/c5d2e6/c5d2e6.png)           | Bordes de tarjetas, separadores                                           |

> **Nota sobre la convención:** en este proyecto Tailwind `primary` = color de acción (iconos y botones azul `#1f3f73`), no el rojo histórico. El rojo litúrgico de los títulos de canción usa el token aparte `song-title` (`text-song-title`). Esto es porque la mayoría de los componentes ya estaban escritos con `bg-primary`/`text-primary` para botones, y mantener esa semántica reduce el cambio.

### Tema Dark (`data-theme="dark"`)

Derivado automáticamente de la paleta light: se invierte la luminosidad del fondo y del texto, y se aclaran los acentos para mantener contraste sobre fondo oscuro.

| Token (Tailwind)   | Hex       | Muestra                                                            | Uso                                                                       |
|--------------------|-----------|--------------------------------------------------------------------|---------------------------------------------------------------------------|
| `background`       | `#0f1626` | ![#0f1626](https://placehold.co/16x16/0f1626/0f1626.png)           | Fondo general                                                             |
| `sidebar`          | `#1a2540` | ![#1a2540](https://placehold.co/16x16/1a2540/1a2540.png)           | Encabezado, pie y barra de menú de acciones                               |
| `primary`          | `#6b8fcc` | ![#6b8fcc](https://placehold.co/16x16/6b8fcc/6b8fcc.png)           | Iconos y botones                                                          |
| `primary-hover`    | `#8aa9e0` | ![#8aa9e0](https://placehold.co/16x16/8aa9e0/8aa9e0.png)           | Hover de iconos y botones                                                 |
| `page-title`       | `#8aa9e0` | ![#8aa9e0](https://placehold.co/16x16/8aa9e0/8aa9e0.png)           | Títulos de páginas                                                        |
| `shortcut`         | `#8aa9e0` | ![#8aa9e0](https://placehold.co/16x16/8aa9e0/8aa9e0.png)           | Atajos / categorías destacadas                                            |
| `song-title`       | `#d96a6a` | ![#d96a6a](https://placehold.co/16x16/d96a6a/d96a6a.png)           | Títulos de canciones, de tarjetas y de playlists                          |
| `secondary`        | `#d4ba75` | ![#d4ba75](https://placehold.co/16x16/d4ba75/d4ba75.png)           | Acentos, subtítulos                                                       |
| `foreground`       | `#e4e7ef` | ![#e4e7ef](https://placehold.co/16x16/e4e7ef/e4e7ef.png)           | Texto normal                                                              |
| `card`             | `#1a2540` | ![#1a2540](https://placehold.co/16x16/1a2540/1a2540.png)           | Fondo de tarjetas (igual al sidebar)                                      |
| `muted-foreground` | `#9aa6bd` | ![#9aa6bd](https://placehold.co/16x16/9aa6bd/9aa6bd.png)           | Texto secundario, metadata                                                |
| `border`           | `#2b3a5c` | ![#2b3a5c](https://placehold.co/16x16/2b3a5c/2b3a5c.png)           | Bordes de tarjetas, separadores                                           |

### Colores de estado (light y dark)

| Token (Tailwind)            | Hex       | Muestra                                                            | Uso                                                  |
|-----------------------------|-----------|--------------------------------------------------------------------|------------------------------------------------------|
| `primary-foreground`        | `#ffffff` | ![#ffffff](https://placehold.co/16x16/ffffff/ffffff.png)           | Texto/icono sobre fondo `primary`                    |
| `success`                   | `#2f7d3a` | ![#2f7d3a](https://placehold.co/16x16/2f7d3a/2f7d3a.png)           | Confirmaciones / estados positivos                   |
| `warning`                   | `#c08a00` | ![#c08a00](https://placehold.co/16x16/c08a00/c08a00.png)           | Advertencias                                         |
| `destructive`               | `#b00020` | ![#b00020](https://placehold.co/16x16/b00020/b00020.png)           | Borrado / errores críticos                           |
| `destructive-foreground`    | `#ffffff` | ![#ffffff](https://placehold.co/16x16/ffffff/ffffff.png)           | Texto/icono sobre fondo `destructive`                |

### Vista de canción — asignación específica

| Elemento                                  | Token (Tailwind) | Hex (light) |
|-------------------------------------------|------------------|-------------|
| Título de la canción                      | `song-title`     | `#8b1a1a`   |
| Número y categorías                       | `secondary`      | `#b49a55`   |
| Encabezado, pie y barra menú de acciones  | `sidebar`        | `#bfd0ea`   |
| Iconos del menú de acciones               | `primary`        | `#1f3f73`   |
| Borde lateral del estribillo              | `song-title`     | `#8b1a1a`   |


## Iconografía

### Convención técnica

Los iconos son **SVG inline propios**, definidos en [`app/components/icons.tsx`](../app/components/icons.tsx). **No** se usa `lucide-react` ni ninguna librería externa de iconos.

Reglas comunes (`baseProps` en `icons.tsx`):

- `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.6}`, `strokeLinecap="round"`, `strokeLinejoin="round"`.
- Tamaño por defecto **18×18**. Excepciones: 20×20 para `SearchIcon` y `UserIcon` (acciones del header), 16×16 para `HelpIcon` (inline en texto).
- El color se hereda del contenedor vía `currentColor` — nunca hardcodear color en el SVG. Estados como "lleno" se logran cambiando `fill` (ver `HeartIcon` con `filled`).
- `aria-hidden="true"` siempre que el icono sea decorativo y vaya acompañado de label/texto accesible.

### Catálogo de iconos

| Concepto                     | Forma visual                  | Componente       | Estado    |
|------------------------------|-------------------------------|------------------|-----------|
| Home / inicio                | Casa                          | `HomeIcon`       | a crear   |
| Canciones / acordes / nota   | Nota musical                  | `ChordsIcon`     | existe    |
| Agregar acorde               | Nota musical con signo `+`    | `AddChordIcon`   | a crear   |
| Partitura                    | Hoja con pentagrama           | `ScoreIcon`      | a crear   |
| Reproducir (YouTube/audio)   | Círculo con triángulo         | `PlayIcon`       | existe    |
| Reproducir YouTube           | Logo de YouTube (rect + ▶)    | `YoutubeIcon`    | existe    |
| Archivos genéricos           | Hoja con líneas               | `FilesIcon`      | existe    |
| Favoritos                    | Corazón (`filled` opcional)   | `HeartIcon`      | existe    |
| Menú "..."                   | Tres puntos horizontales      | `MoreIcon`       | existe    |
| Buscar                       | Lupa                          | `SearchIcon`     | existe    |
| Usuario / perfil             | Persona                       | `UserIcon`       | existe    |
| Cerrar                       | Cruz (X)                      | `CloseIcon`      | existe    |
| Avanzar / submenú            | Chevron derecho               | `ChevronRightIcon` | existe  |
| Ayuda                        | Círculo con "?"               | `HelpIcon`       | existe    |
| Descargar (PDF, partitura, cancionero, QR) | Flecha hacia abajo a bandeja | `DownloadIcon`   | a crear   |
| Editar                       | Lápiz                         | `EditIcon`       | a crear   |
| Eliminar (en listas inline)  | Tacho de basura               | `TrashIcon`      | a crear   |
| Ver / vista previa           | Ojo                           | `ViewIcon`       | a crear   |
| Agregar                      | Signo `+` (en círculo)        | `PlusIcon`       | a crear   |
| Quitar                       | Signo `−` (en círculo)        | `MinusIcon`      | existe    |
| Guardar (form)               | Sin icono — solo texto        | —                | —         |
| Cancelar (form)              | Sin icono — solo texto        | —                | —         |
| Playlists                    | Lista con check / 3 líneas    | `PlaylistIcon`   | existe    |
| Parroquia                    | Iglesia simple (cruz arriba)  | `ParishIcon`     | a crear   |
| Compartir                    | Nodos conectados              | `ShareIcon`      | existe    |
| QR                           | Cuadro QR                     | `QrIcon`         | existe (hoy embebido en `qr-button.tsx`, mover a `icons.tsx`) |
| No apagar pantalla           | Pantalla con base             | `ModoCoroIcon`   | existe (inline en `site-header.tsx`) |
| Orientaciones litúrgicas     | Libro cerrado con una cruz    | `BibleIcon`      | existe    |

### Botones de formulario

Tres botones estandarizados, siempre en este orden visual: **Eliminar** alineado a la izquierda, **Cancelar** y **Guardar** alineados a la derecha.

| Botón     | Variante         | Color base       | Icono       | Cuándo aparece                                   |
|-----------|------------------|------------------|-------------|--------------------------------------------------|
| Guardar   | primary          | `primary` (rojo) | — (sin icono) | Siempre en formularios de creación/edición.    |
| Cancelar  | ghost / outline  | neutro           | — (sin icono) | Siempre en formularios.                        |
| Eliminar  | destructive      | `destructive`    | `TrashIcon` a la izquierda del label | Solo en formularios de **edición** (no en creación). |

### Botones de acción inline (en listas y filas)

Botones-icono cuadrados, sin label visible, con `aria-label` accesible y `title` para tooltip. Tamaño táctil mínimo: 32×32 (área clickeable), icono 18×18 centrado. Color del icono: `muted-foreground` por defecto, `foreground` en hover; el de **eliminar** usa `destructive`.

Iconos típicos en filas: `EditIcon`, `TrashIcon`, `ViewIcon`, `DownloadIcon`, `MoreIcon`.

### Menús contextuales ("...")

Patrón unificado para los menús que se abren desde un botón `MoreIcon`. Ejemplos: header del usuario, menú de canción dentro de una playlist, menú de playlist en `/admin/playlists`.

Reglas:

- Cada item del menú lleva **icono a la izquierda + label** (mismo gap, alineación vertical centrada). El icono usa el componente del catálogo, nunca un emoji o texto.
- Items destructivos (Eliminar, Quitar de…) usan color `destructive` para el icono y el label.
- Items deshabilitados se muestran con opacidad reducida (no se ocultan).
- Submenús se indican con `ChevronRightIcon` al final del item (ej: "Agregar a playlist ›").

**Ejemplo — menú de canción dentro de una playlist:**

| Icono            | Label                       | Notas                          |
|------------------|-----------------------------|--------------------------------|
| `PlaylistIcon`   | Agregar a playlist          | Submenú → `ChevronRightIcon`   |
| `ChordsIcon`     | Ver canción                 |                                |
| `ShareIcon`      | Compartir                   |                                |
| `HeartIcon`      | Agregar a Mis favoritos     | `filled` si ya es favorito     |
| `MinusIcon`      | Quitar de esta playlist     | Color `destructive`            |

**Ejemplo — menú del header del usuario** (ya implementado, sirve como referencia visual): encabezado con avatar + nombre + email (o "Invitado" + botón "Iniciá sesión") · Cantos · Listas · Parroquias · Novedades · (separador) · No apagar pantalla · `MoonIcon` Modo oscuro · `QrIcon` Descargar QR · `ShieldIcon` Administración (solo admin) · Instalar app · Cerrar Sesión.

## Cards con imagen (`CardWithImage`)

Layout estándar de las cards "navegables" del sitio (playlists, parroquias, anuncios, secciones de admin, etc.).

```
┌──────────────────────────────────────────────────────────┐
│ ░░░  Título                                          ♥   │
│ ░░░  Subtítulo / badge / descripción                     │
│ ░░░                                                  ›   │
└──────────────────────────────────────────────────────────┘
```

- **Imagen (opcional):** banda de 75px de ancho a la izquierda, fondo `sidebar`, `object-cover`.
- **Contenido:** título + metadata. Padding `p-5` con `pr-10` para reservar espacio del chevron.
- **Esquina superior derecha:** acción contextual de la card (típicamente `HeartIcon` para favoritos). Posición `absolute top-3 right-3`.
- **Esquina inferior derecha:** indicador de navegación (`ChevronRightIcon` para rutas internas, `ExternalLinkIcon` para externas). Posición `absolute bottom-3 right-3`. Color `muted-foreground`.
- Hover: borde a `primary`.


## Lista de canciones (item)

Layout estándar de cada fila de canción. Aplica en **todas** las listas: playlists, resultados de búsqueda, favoritos, canciones de parroquia, vistas de admin, etc.

Estructura visual de la fila:

**Variante pública** (listas, playlists, búsqueda, favoritos, parroquia):

```
┌──────────────────────────────────────────────────────────┐
│ N · Título de la canción                              ⋯  │
│ Category · Autor  ♪  ▶  📄  ♥                            │
└──────────────────────────────────────────────────────────┘
```

**Variante admin** (listados editoriales, ej. `/admin/canciones`):

```
┌──────────────────────────────────────────────────────────┐
│ N · Título de la canción                                 │
│ Category · Autor  ♪  ▶  📄                          [✎]  │
│ Modificada 05 de mayo de 2026 · PUBLICADA                │
└──────────────────────────────────────────────────────────┘
```

- **Línea 1 — izquierda:** `N · Título`.
  - Numeración sin ceros a la izquierda (`1`, `2`, … `10`, nunca `01`).
  - Si la lista no tiene orden numérico (búsqueda, favoritos), se omite el número.
- **Línea 2 — izquierda:** `Category · Autor` seguido de los iconos de metadata (en este orden, solo si su flag está activo):
  1. `ChordsIcon` — la canción tiene acordes.
  2. `PlayIcon` — tiene video de YouTube.
  3. `FilesIcon` — tiene partitura u otros archivos.
  4. `HeartIcon` (`filled`) — es favorita del usuario actual (solo variante pública).
  - Color `muted-foreground`; tamaño 18×18.
- **Línea 3 (solo admin):** `Modificada {fecha}` + `SongStatusBadge` con el estado editorial.
- **Botón de acción a la derecha:**
  - Pública: `MoreIcon` (`⋯`) que abre menú de acciones.
  - Admin: `EditIcon` (lápiz) que linkea al editor.
  - En ambos casos, alineado a la derecha y centrado verticalmente respecto a las líneas del item.


## Estribillo (en vista de canción)

Las líneas marcadas como estribillo en el `body` (entre `{start_of_chorus}` y `{end_of_chorus}`, o `{soc}` / `{eoc}`) se renderizan como un bloque visualmente distinto del resto de la letra:

- **Borde lateral izquierdo** de 3px en color `primary`.
- **Padding izquierdo** chico que separa el texto del borde.
- **Negrita** en todo el bloque (los acordes ya en negrita se mantienen).
- Margen vertical reducido para mantener el bloque cohesionado.

Aplica en la vista pública (`/canciones/[slug]`) y en la previsualización del editor (`/admin/canciones/[id]/editar`).
