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

Valores actuales tomados de [`app/globals.css`](../app/globals.css). Tentativos hasta que la Comisión apruebe la paleta final.

### Colores semánticos

| Token              | Hex       | Muestra                                                            | Uso                                                  |
|--------------------|-----------|--------------------------------------------------------------------|------------------------------------------------------|
| `primary`          | `#8b1a1a` | ![#8b1a1a](https://placehold.co/16x16/8b1a1a/8b1a1a.png)           | Rojo litúrgico — títulos en mayúscula, acción principal |
| `primary-hover`    | `#6f1414` | ![#6f1414](https://placehold.co/16x16/6f1414/6f1414.png)           | Estado hover de la acción principal                  |
| `secondary`        | `#c9a227` | ![#c9a227](https://placehold.co/16x16/c9a227/c9a227.png)           | Dorado litúrgico (tentativo)                         |
| `brand-dark`       | `#2a0a0a` | ![#2a0a0a](https://placehold.co/16x16/2a0a0a/2a0a0a.png)           | Variante oscura de marca                             |
| `success`          | `#2f7d3a` | ![#2f7d3a](https://placehold.co/16x16/2f7d3a/2f7d3a.png)           | Confirmaciones / estados positivos                   |
| `warning`          | `#c08a00` | ![#c08a00](https://placehold.co/16x16/c08a00/c08a00.png)           | Advertencias                                         |
| `destructive`      | `#b00020` | ![#b00020](https://placehold.co/16x16/b00020/b00020.png)           | Borrado / errores críticos                           |

### Tema Light (por defecto)

| Token              | Hex       | Muestra                                                            | Uso                                  |
|--------------------|-----------|--------------------------------------------------------------------|--------------------------------------|
| `background`       | `#fafaf7` | ![#fafaf7](https://placehold.co/16x16/fafaf7/fafaf7.png)           | Fondo de página (casi blanco, cálido) |
| `foreground`       | `#111111` | ![#111111](https://placehold.co/16x16/111111/111111.png)           | Texto principal                       |
| `sidebar`          | `#f1ede5` | ![#f1ede5](https://placehold.co/16x16/f1ede5/f1ede5.png)           | Header, footer y paneles laterales    |
| `border`           | `#e2dccd` | ![#e2dccd](https://placehold.co/16x16/e2dccd/e2dccd.png)           | Bordes de tarjetas, separadores       |
| `muted-foreground` | `#5b5b5b` | ![#5b5b5b](https://placehold.co/16x16/5b5b5b/5b5b5b.png)           | Texto secundario, metadata            |

### Tema Dark (`prefers-color-scheme: dark`)

| Token              | Hex       | Muestra                                                            | Uso                                  |
|--------------------|-----------|--------------------------------------------------------------------|--------------------------------------|
| `background`       | `#2d2420` | ![#2d2420](https://placehold.co/16x16/2d2420/2d2420.png)           | Fondo de página                       |
| `foreground`       | `#f4efe6` | ![#f4efe6](https://placehold.co/16x16/f4efe6/f4efe6.png)           | Texto principal                       |
| `sidebar`          | `#614f47` | ![#614f47](https://placehold.co/16x16/614f47/614f47.png)           | Header, footer y paneles laterales    |
| `border`           | `#2b2722` | ![#2b2722](https://placehold.co/16x16/2b2722/2b2722.png)           | Bordes de tarjetas, separadores       |
| `muted-foreground` | `#a39b8b` | ![#a39b8b](https://placehold.co/16x16/a39b8b/a39b8b.png)           | Texto secundario, metadata            |


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

**Ejemplo — menú del header del usuario** (ya implementado, sirve como referencia visual): `UserIcon` Perfil · `MoonIcon` Modo oscuro · `ChordsIcon` Sugerir acordes · `PlaylistIcon` Playlists · `ParishIcon` Parroquias · `ShieldIcon` Administración · `QrIcon` Descargar QR.

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

- **Borde lateral izquierdo** de 4px en color `primary`.
- **Padding izquierdo** que separa el texto del borde.
- **Itálica** en todo el bloque (la negrita de los acordes se mantiene).
- Margen vertical reducido para mantener el bloque cohesionado.

Aplica en la vista pública (`/canciones/[slug]`) y en la previsualización del editor (`/admin/canciones/[id]/editar`).


## Componentes

- badges:
- headers:
- tablas:
- forms:
- diálogos:
- botones:
