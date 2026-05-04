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
| Quitar                       | Signo `−` (en círculo)        | `MinusIcon`      | a crear   |
| Guardar (form)               | Sin icono — solo texto        | —                | —         |
| Cancelar (form)              | Sin icono — solo texto        | —                | —         |
| Playlists                    | Lista con check / 3 líneas    | `PlaylistIcon`   | a crear   |
| Parroquia                    | Iglesia simple (cruz arriba)  | `ParishIcon`     | a crear   |
| Compartir                    | Nodos conectados              | `ShareIcon`      | a crear   |
| QR                           | Cuadro QR                     | `QrIcon`         | existe (hoy embebido en `qr-button.tsx`, mover a `icons.tsx`) |

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

```
┌──────────────────────────────────────────────────────────┐
│ N. Título de la canción                               ⋯  │
│                       Autor  ♪  ▶  ♥                     │
└──────────────────────────────────────────────────────────┘
```

- **Línea 1 — arriba a la izquierda:** `N.` + `Título`.
  - Numeración **sin ceros a la izquierda** (`1.`, `2.`, … `10.`, nunca `01.`).
  - Si la lista no tiene orden numérico (ej. resultados de búsqueda, favoritos), se omite el número.
- **Línea 2 — abajo a la derecha:** `Autor` · iconos de metadata, en este orden:
  1. `ChordsIcon` si la canción tiene acordes.
  2. `PlayIcon` si tiene referencia de YouTube.
  3. `HeartIcon` (`filled`) si es favorita del usuario actual.
  - Solo se renderizan los iconos cuyo flag está activo — no se reservan placeholders.
  - Color `muted-foreground`; tamaño 18×18 (default del catálogo).
- **Botón de menú "..." (`MoreIcon`):** alineado a la **derecha** del item y **centrado verticalmente** respecto a las dos líneas de contenido. Se comporta como botón inline de acción (ver sección "Botones de acción inline").


## Componentes

- badges:
- headers:
- tablas:
- forms:
- diálogos:
- botones:
