# CASOS DE USO — Cancionero Arquidiocesano Digital

Este documento detalla los casos de uso del sistema, derivados de los requerimientos funcionales (RF) descriptos en [`especificacion_tecnica.md`](especificacion_tecnica.md) §5.1.

---

## Índice

| ID      | Nombre                                               | RF        | Hecho |
| ------- | ---------------------------------------------------- | --------- | ----- |
| CU-01   | Buscar cualquier cosa (parroquia, canción, playlist) | RF4       | [x]   |
| CU-02.1 | Ver canción con letra                                | RF5       | [x]   |
| CU-02.2 | Ver canción con letra y acordes                      | RF5       | [x]   |
| CU-03   | Transponer tonalidad                                 | RF6       | [x]   |
| CU-04   | Reproducir referencia de YouTube                     | RF8       | [x]   |
| CU-05   | Ver playlist de parroquia                            | RF3, RF12 | [x]   |
| CU-06.1 | Buscar parroquia                                     | RF11      | [x]   |
| CU-06.2 | Acceder a parroquia por URL                          | RF11      | [x]   |
| CU-07   | Visualizar novedades / festividad del día            | —         | [x]   |
| CU-08   | Silenciar dispositivo y mantener pantalla            | RF20      | [x]   |
| CU-09   | Descargar partitura                                  | RF7       |       |
| CU-10   | Descargar canción para imprimir                      | RF14      |       |
| CU-11   | Descargar playlist como cancionero                   | RF15      |       |
| CU-12   | Descargar QR de la página actual                     | RF13      | [x]   |
| CU-13   | Login con Google                                     | RF16      | [x]   |
| CU-14   | Vincular usuario a parroquia                         | RF17      |       |
| CU-15   | Marcar favoritos                                     | RF18      |       |
| CU-16   | ABM de canción                                       | RF1       |       |
| CU-17   | ABM de playlist                                      | RF2       |       |
| CU-18   | ABM de usuario                                       | RF9       |       |
| CU-19   | ABM de parroquia                                     | RF10      | [x]   |
| CU-20   | Gestionar permisos                                   | RF21      |       |
| CU-21   | Gestionar anuncios programados                       | RF19      |       |
| CU-22   | Gestionar "Mis favoritos"                            | RF18      |       |
| CU-23   | Lista de canciones con badges y menú contextual      | RF4       | [x]   |
| CU-24   | Barra de acciones global en el header                | RF4, RF18 | [x]   |
| CU-25   | Creación de categorías litúrgicas                    | RF22      |       |

---

## Actores

- **Visitante:** usuario anónimo (asamblea, fiel cualquiera).
- **Músico/Corista:** usuario que utiliza la app para ejecutar repertorio.
- **Coordinador parroquial:** usuario autenticado, gestiona playlists y datos de su parroquia.
- **Editor de contenido:** usuario autenticado con permisos para ABM de canciones (Comisión Litúrgico-Musical).
- **Administrador:** usuario con permisos plenos (parroquias, usuarios, permisos, anuncios).

---

## CU-01: Buscar cualquier cosa (parroquia, cancion, playlist)

- **RF:** RF4
- **Actor primario:** Visitante / Músico
- **Precondiciones:** Catálogo de canciones cargado.
- **Disparador:** El usuario escribe en el campo de búsqueda.
- **Flujo principal:**
  1. El usuario ingresa un término (título, fragmento de letra, número, playlist, categoría, parroquia).
  2. El sistema consulta el catálogo y devuelve resultados ordenados por relevancia.
  3. El usuario selecciona una canción.
  4. El sistema navega a la vista de canción (CU-02).
  5. Si es una playlist, se muestra la playlist en lugar de la cancion (CU-05).
  6. Si es una parroquia, se muestra la parroquia (CU-06.2)
- **Flujos alternativos:**
  - 2a. Sin resultados: el sistema muestra mensaje "No se encontraron canciones" y sugerencias de categorías.
  - 2b. Búsqueda vacía: el sistema muestra el catálogo completo paginado.
- **Postcondiciones:** Ninguna persistente.

---

## CU-02.1: Ver canción con letra

- **RF:** RF5
- **Actor primario:** Visitante
- **Precondiciones:** La canción existe en el catálogo.
- **Disparador:** El usuario navega a `/canciones/{id}` (o desde búsqueda/playlist).
- **Flujo principal:**
  1. El sistema carga la canción: título, autor, categoría, letra, acordes y link de YouTube si existe.
  2. El sistema renderiza letra sin acordes.
  3. El usuario puede alternar la visibilidad de los acordes.
- **Flujos alternativos:**
  - 1a. Canción inexistente: el sistema muestra 404.
  - 3a. Canción sin acordes: el toggle queda deshabilitado.
- **Postcondiciones:** Ninguna persistente.

---

## CU-02.2: Ver canción con letra y acordes

- **RF:** RF5
- **Actor primario:** Músico
- **Precondiciones:** La canción existe en el catálogo.
- **Disparador:** El usuario navega a `/canciones/{id}` (o desde búsqueda/playlist).
- **Flujo principal:**
  1. El sistema carga la canción: título, autor, categoría, letra, acordes y link de YouTube si existe.
  2. El sistema renderiza letra con acordes alineados sobre las sílabas correspondientes.
  3. El usuario puede alternar la visibilidad de los acordes.
- **Flujos alternativos:**
  - 1a. Canción inexistente: el sistema muestra 404.
  - 3a. Canción sin acordes: el toggle queda deshabilitado.
- **Postcondiciones:** Ninguna persistente.

---

## CU-03: Transponer tonalidad

- **RF:** RF6
- **Actor primario:** Músico
- **Precondiciones:** Estar en la vista de canción con acordes (CU-02).
- **Disparador:** El usuario hace clic en + / − del selector de tono.
- **Flujo principal:**
  1. El usuario solicita subir o bajar un semitono (o seleccionar un tono específico).
  2. El sistema recalcula todos los acordes manteniendo la relación armónica.
  3. El sistema renderiza los acordes en la nueva tonalidad y muestra el delta respecto del original.
  4. El usuario puede restablecer al tono original.
- **Flujos alternativos:**
  - 2a. Acorde no estándar: el sistema preserva el acorde tal cual y registra advertencia (no bloqueante).
  - 1a. **Usuario autenticado:** el tono elegido se persiste en `user_song_keys` (server-side) y queda asociado a su cuenta; al volver a abrir la canción desde cualquier dispositivo se restaura automáticamente.
  - 1b. **Usuario anónimo:** el tono elegido se persiste solo en `localStorage` por canción mientras dure el navegador.
- **Precedencia del tono inicial al abrir una canción** (de mayor a menor prioridad):
  1. **Contexto de playlist** — si la canción se abre desde una playlist y `playlist_songs.key_override` está definido, se usa ese tono. El coordinador armó la playlist pensando esa tonalidad para la celebración.
  2. **Preferencia del usuario** — `user_song_keys` (si está autenticado) o `localStorage` (si es anónimo).
  3. **Tono original** — `songs.original_key`.
  - Si el usuario transpone mientras está en contexto de playlist, el cambio se aplica solo a la sesión actual y **no** sobreescribe `playlist_songs.key_override` ni `user_song_keys`.
- **Postcondiciones:**
  - Anónimo: tono guardado en `localStorage` por canción.
  - Autenticado fuera de playlist: tono guardado en `user_song_keys (user_id, song_id)` y disponible en cualquier dispositivo.
  - Dentro de playlist: ningún cambio persistido (override sólo en sesión).

---

## CU-04: Reproducir referencia de YouTube

- **RF:** RF8
- **Actor primario:** Músico / Visitante
- **Precondiciones:** La canción tiene un link de YouTube asociado.
- **Disparador:** El usuario hace clic en "Reproducir".
- **Flujo principal:**
  1. El sistema embebe el reproductor de YouTube en la vista de canción.
  2. El usuario puede reproducir, pausar, ajustar volumen.
- **Flujos alternativos:**
  - 1a. Canción sin link: el botón no aparece.
  - 1b. Video no disponible: YouTube muestra su error nativo.
- **Postcondiciones:** Ninguna.

---

## CU-05: Ver playlist de parroquia

- **RF:** RF3, RF12
- **Actor primario:** Visitante / Músico
- **Precondiciones:** La playlist existe y es pública.
- **Disparador:** El usuario navega a `/playlist/{id}` (o desde la parroquia).
- **Flujo principal:**
  1. El sistema carga la playlist: nombre, parroquia, fecha, lista ordenada de canciones.
  2. El usuario puede entrar a cada canción (CU-02) sin perder el orden de la playlist.
  3. El sistema ofrece navegación "anterior / siguiente" dentro de la playlist.
- **Flujos alternativos:**
  - 1a. Playlist inexistente: 404.
- **Postcondiciones:** Ninguna persistente.

---

## CU-06.1: Buscar parroquia

- **RF:** RF11
- **Actor primario:** Visitante
- **Precondiciones:** La parroquia existe.
- **Disparador:** El usuario escribe en el campo de búsqueda.
- **Flujo principal:**
  1. El sistema carga la página de la parroquia con sus playlists públicas y novedades propias.
  2. El usuario navega a una playlist (CU-05) o a una canción (CU-02).
- **Flujos alternativos:**
  - 1a. Slug inexistente: 404.
- **Postcondiciones:** Ninguna persistente.

---
## CU-06.2: Acceder a parroquia por URL

- **RF:** RF11
- **Actor primario:** Visitante
- **Precondiciones:** La parroquia existe.
- **Disparador:** El usuario abre `/parroquia/{slug}` (típicamente desde un QR físico en la parroquia).
- **Flujo principal:**
  1. El sistema carga la página de la parroquia con sus playlists públicas y novedades propias.
  2. El usuario navega a una playlist (CU-05) o a una canción (CU-02).
- **Flujos alternativos:**
  - 1a. Slug inexistente: 404.
- **Postcondiciones:** Ninguna persistente.

---

## CU-07: Visualizar novedades / festividad del día

- **RF:** —
- **Actor primario:** Visitante
- **Precondiciones:** Existe contenido marcado como "novedad" o "festividad" para la fecha actual.
- **Disparador:** El usuario abre la home `/`.
- **Flujo principal:**
  1. El sistema busca un evento en `liturgical_events` con `event_date = hoy`. Si existe, lo muestra como "Festividad de hoy" con su descripción y CTA a la playlist asociada (si aplica).
  2. Si no hay evento en la base, el sistema **calcula la festividad litúrgica del día** usando la librería `romcal` con calendario `argentina` (ver `lib/liturgical.ts`). Si el rango de la celebración es ≥ memoria (solemnidad, domingo, fiesta, memoria), la muestra como título; si es feria, muestra el tiempo litúrgico (Adviento, Cuaresma, Tiempo Ordinario, etc.).
  3. El sistema muestra novedades activas (`featured_content` con ventana vigente) en una sección separada.
  4. El usuario navega al contenido de su interés.
- **Flujos alternativos:**
  - 1a. Sin festividad ni novedades: la home muestra el tiempo litúrgico calculado y acceso al buscador y al catálogo.
- **Postcondiciones:** Ninguna persistente.

### Sobre los nombres en español

`romcal` no incluye locale en español. El módulo `lib/liturgical.ts` mantiene un mapa local (`NAME_ES`) con las solemnidades, fiestas y memorias más comunes (general + Argentina). Las que no están mapeadas se muestran en inglés. A medida que se necesite, se agregan claves al mapa.

---

## CU-08: Silenciar dispositivo y mantener pantalla activa

- **RF:** RF20
- **Actor primario:** Músico / Corista
- **Precondiciones:** El usuario está en una vista de canción o playlist en un dispositivo móvil.
- **Disparador:** El usuario activa el modo "Modo coro" (toggle).
- **Flujo principal:**
  1. El sistema solicita el `Wake Lock` para impedir que la pantalla se apague.
  2. El sistema silencia notificaciones / sonidos del navegador donde sea posible.
  3. La pantalla permanece activa mientras el modo esté encendido.
  4. El usuario desactiva el modo y se libera el `Wake Lock`.
- **Flujos alternativos:**
  - 1a. Navegador no soporta Wake Lock API: se muestra advertencia indicando ajustar manualmente la configuración de pantalla.
  - 2a. El navegador no permite silenciar a nivel SO: el sistema solo silencia su propio audio embebido.
- **Postcondiciones:** El modo se restablece al cerrar la pestaña.

---

## CU-09: Descargar partitura

- **RF:** RF7
- **Actor primario:** Músico
- **Precondiciones:** La canción tiene una partitura asociada en Supabase Storage.
- **Disparador:** El usuario hace clic en "Descargar partitura".
- **Flujo principal:**
  1. El sistema solicita una URL firmada al bucket `partituras`.
  2. El navegador descarga el PDF.
- **Flujos alternativos:**
  - 1a. Sin partitura: el botón no aparece.
  - 1b. Falla la firma: se muestra mensaje de error con opción de reintentar.
- **Postcondiciones:** Ninguna persistente.

---

## CU-10: Descargar canción para imprimir

- **RF:** RF14
- **Actor primario:** Músico
- **Precondiciones:** Estar en la vista de canción.
- **Disparador:** El usuario elige "Descargar para imprimir" y selecciona "con acordes" / "sin acordes".
- **Flujo principal:**
  1. El sistema genera un PDF (server-side) con el formato impreso (A4, tipografía Cardo, títulos en mayúscula rojo).
  2. El navegador descarga el archivo.
- **Flujos alternativos:**
  - 1a. Falla la generación: se muestra mensaje de error.
- **Postcondiciones:** Ninguna persistente.

---

## CU-11: Descargar playlist como cancionero

- **RF:** RF15
- **Actor primario:** Coordinador parroquial / Músico
- **Precondiciones:** La playlist tiene al menos una canción.
- **Disparador:** El usuario elige "Descargar cancionero" desde la vista de playlist.
- **Flujo principal:**
  1. El usuario elige opciones (con/sin acordes, tamaño A4, índice sí/no).
  2. El sistema arma un PDF concatenando cada canción con portada (nombre de parroquia) e índice.
  3. El navegador descarga el archivo.
- **Flujos alternativos:**
  - 2a. Una canción no se puede renderizar: se omite y se reporta en el índice como faltante.
- **Postcondiciones:** Ninguna persistente.

---

## CU-12: Descargar QR de la página actual

- **RF:** RF13
- **Actor primario:** Coordinador parroquial / Visitante
- **Precondiciones:** Estar en una página con URL pública (canción, playlist, parroquia).
- **Disparador:** El usuario elige "Descargar QR".
- **Flujo principal:**
  1. El sistema genera un QR con la URL canónica de la página actual.
  2. El usuario descarga la imagen (PNG/SVG).
- **Flujos alternativos:** Ninguno.
- **Postcondiciones:** Ninguna persistente.

---

## CU-13: Login con Google

- **RF:** RF16
- **Actor primario:** Visitante
- **Precondiciones:** Supabase Auth con provider Google habilitado.
- **Disparador:** El usuario hace clic en "Ingresar con Google".
- **Flujo principal:**
  1. El sistema redirige al flujo OAuth de Google.
  2. Tras consentimiento, Supabase emite la sesión y la cookie es seteada por el Proxy.
  3. El usuario queda autenticado y se redirige a la página origen.
- **Flujos alternativos:**
  - 2a. El usuario cancela: vuelve a la página origen sin sesión.
  - 2b. Error de OAuth: se muestra mensaje y opción de reintentar.
- **Postcondiciones:** Sesión activa. Si es la primera vez, se crea el registro en `users`.

---

## CU-14: Vincular usuario a parroquia

- **RF:** RF17
- **Actor primario:** Usuario autenticado
- **Precondiciones:** Sesión activa (CU-13).
- **Disparador:** El usuario abre su perfil y selecciona "Mi parroquia".
- **Flujo principal:**
  1. El usuario busca y selecciona su parroquia.
  2. El sistema crea o actualiza la relación `usuario ↔ parroquia`.
  3. La home pasa a destacar contenido de esa parroquia.
- **Flujos alternativos:**
  - 1a. Parroquia inexistente: se ofrece solicitar su alta al administrador.
- **Postcondiciones:** Relación persistida.

---

## CU-15: Marcar favoritos

- **RF:** RF18
- **Actor primario:** Usuario autenticado
- **Precondiciones:** Sesión activa.
- **Disparador:** El usuario hace clic en el ícono de corazón presente en:
  - la página de detalle de una canción, playlist o parroquia,
  - el menú contextual "⋯" de un ítem de listado (CU-23),
  - el botón "Agregar a Mis favoritos" del menú contextual.
- **Flujo principal:**
  1. El sistema registra el like del usuario sobre el recurso (`favorites (user_id, target_kind, target_id)`).
  2. El ícono de corazón pasa a estado "lleno" en todas las vistas que muestran ese recurso.
  3. El recurso aparece en la sección "Mis favoritos" (CU-22) ordenado por fecha de marca descendente.
  4. El usuario puede quitar el favorito desde cualquiera de los puntos de entrada (toggle).
- **Flujos alternativos:**
  - 1a. **Sin sesión:** el ícono de corazón es visible pero al hacer clic se invita a iniciar sesión (CU-13). No se persiste nada.
- **Postcondiciones:** Like persistido o eliminado en `favorites`.

---

## CU-16: ABM de canción (flujo editorial `draft → review → published`)

- **RF:** RF1
- **Actores primarios:**
  - **Coordinador parroquial:** crea/edita y envía a revisión.
  - **Editor de contenido:** aprueba o rechaza.
- **Precondiciones:** Sesión activa con uno de los roles indicados.
- **Disparadores:**
  - Coordinador: accede a `/admin/canciones` y crea/edita un borrador.
  - Editor: accede a `/admin/canciones?estado=review` y revisa pendientes.

### Flujo principal — Coordinador parroquial (envía)

1. El coordinador crea una canción nueva o edita una existente: título, autor, categoría, letra, acordes (ChordPro), tonalidad original, tempo, tags, link YT, partituras y audios.
2. El sistema valida formato de acordes y campos obligatorios.
3. El sistema sube los archivos a Supabase Storage (`partituras`, `audios`) en estado `draft` (no son visibles públicamente).
4. La canción queda persistida con `status = 'draft'`. El coordinador puede seguir editándola.
5. Cuando considera que está lista, hace clic en **"Enviar a revisión"**.
6. El sistema cambia `status` a `'review'`, registra `submitted_by` y `submitted_at`, y notifica a los Editores. La canción queda bloqueada para edición salvo por el Editor.

### Flujo principal — Editor de contenido (aprueba / rechaza)

1. El editor abre la cola de revisión y ve la canción con sus archivos.
2. **Aprobar:**
   1. El editor confirma "Aprobar".
   2. El sistema cambia `status` a `'published'`, registra `reviewed_by`, `reviewed_at`, `published_at`.
   3. El sistema inserta una nueva fila en `song_versions` con el snapshot del contenido aprobado e incrementa `songs.current_version`.
   4. Los archivos asociados (`song_files`) pasan también a `'published'` y quedan accesibles públicamente.
   5. La canción aparece en búsquedas (CU-01) y vistas públicas (CU-02).
3. **Rechazar:**
   1. El editor escribe `review_notes` (obligatorio) explicando los cambios solicitados.
   2. El sistema cambia `status` a `'rejected'`, registra `reviewed_by` y `reviewed_at`.
   3. La canción vuelve a ser editable por el coordinador (puede pasar nuevamente a `'draft'` al editarla).
   4. El sistema notifica al coordinador.

### Flujos alternativos

- **2a (validación):** Acordes mal formados → error inline; no se permite enviar a revisión.
- **6a (sin permisos):** Un usuario sin rol Coordinador o Editor no puede acceder a `/admin/canciones` (RLS rechaza).
- **Edición concurrente:** Si la canción está en `'review'`, el coordinador no puede editarla; debe esperar a que el editor decida o "retirar de revisión" (vuelve a `'draft'`).
- **Baja lógica (`archived`):** Solo Editor o Admin pueden archivar. Se confirma con doble paso. Las playlists que la contenían marcan la canción como "no disponible" y dejan de mostrarla en vistas públicas; el historial de `song_versions` se preserva.
- **Edición de canción ya publicada:** Editar una canción `'published'` crea una nueva edición que pasa por el flujo `draft → review → published`. La versión publicada anterior sigue activa en `song_versions` hasta que se apruebe la nueva.

### Postcondiciones

- Canción persistida en `songs` con su estado actual.
- Si fue aprobada: nueva fila en `song_versions` con `published_at`, `current_version` incrementado, archivos en Storage públicos.
- Traza completa de la transición editorial (`submitted_by/at`, `reviewed_by/at`, `review_notes`).

### CU-16.1: Editar canción (sin acordes)

Edición rápida de una canción cuando solo se modifica la letra y los metadatos, sin tocar acordes.

- **Disparador:** desde la vista de canción o desde `/admin/canciones`, opción "Editar".
- **Campos editables:** `title`, `number`, `author_id`, `category_id`, `body` (solo letra, sin marcadores `[acorde]`), `tempo_bpm`, `tags`, `youtube_url`.
- **Flujo:** al guardar, si la canción estaba `published` se crea una nueva edición en estado `draft` que sigue el flujo de revisión (CU-16). Si estaba en `draft`/`rejected`, se sobrescribe.
- **Flujos alternativos:**
  - 1a. La canción tenía acordes en `body` previos: el editor "sin acordes" preserva los marcadores intactos y solo muestra la letra plana; los acordes no se pierden.

### CU-16.2: Editar acordes y tonalidad de una canción

Edición específica de la información musical.

- **Disparador:** desde la vista de canción, opción "Editar acordes".
- **Campos editables:**
  - `body` con marcadores `[acorde]` en formato ChordPro mínimo.
  - `original_key`: tonalidad general de la canción (texto libre validado contra el conjunto de notas válidas en notación latina o inglesa).
- **Flujo:**
  1. El sistema muestra la letra con los marcadores actuales y un campo separado para la tonalidad original.
  2. El usuario inserta/quita/edita marcadores `[acorde]` directamente sobre la letra y/o cambia `original_key`.
  3. El sistema valida que cada acorde sea reconocible (ver `lib/chordpro.ts`); si no, marca error inline pero permite guardar como draft.
  4. Al enviar a revisión, se aplica el flujo de CU-16. Cambiar `original_key` no recalcula los acordes existentes (es solo metadato).
- **Postcondiciones:** `songs.body` y `songs.original_key` actualizados; al publicarse, queda registrado en `song_versions`.

---

## CU-17: ABM de playlist

- **RF:** RF2
- **Actor primario:** Coordinador parroquial
- **Precondiciones:** Sesión vinculada a una parroquia (CU-14).
- **Disparador:** El usuario accede a "Mis playlists" en su parroquia o entra a una playlist de la cual es coordinador.
- **Flujo principal:**
  1. El usuario crea una playlist (nombre, fecha, descripción, visibilidad).
  2. Al ingresar a la playlist, ve la lista de canciones igual que el listado común (mismas columnas y badges, ver CU-23) pero con dos diferencias:
     - aparece la **barra de acciones de playlist** (CU-17.1),
     - el menú contextual "⋯" de cada canción incluye el item **"Quitar de esta playlist"** (CU-17.2).
  3. El sistema persiste cada cambio inmediatamente, salvo el modo "Editar" en lote (CU-17.1.b).
- **Flujos alternativos:**
  - 1a. Sin permisos sobre la parroquia: el sistema rechaza la operación (RLS).
- **Postcondiciones:** Playlist persistida.

### CU-17.1: Barra de acciones de la playlist

En la vista de una playlist (cuando el usuario tiene permisos), se muestra una barra superior con cuatro botones:

a. **Agregar** — abre un buscador de canciones (mismo motor que CU-01) restringido a `songs.status = 'published'`. Al seleccionar una, se agrega al final de la playlist y se persiste en `playlist_songs` con `position = max(position) + 1`.

b. **Editar** — abre un diálogo modal con la lista de canciones de la playlist. Cada fila tiene:
   - un ícono `−` (a la izquierda) que marca la canción para eliminar,
   - un asa "hamburguesa" (a la derecha) que permite arrastrar para reordenar (subir/bajar).

   La barra de título del diálogo es: `[ Cancelar ]   TITULO DE PLAYLIST   [ Guardar ]`. Mientras el diálogo está abierto los cambios no se persisten — solo al pulsar **Guardar** se aplican en `playlist_songs` (delete + reordenar `position`). **Cancelar** descarta todo.

c. **Ordenar** — abre un menú con opciones de orden de visualización (no modifica `position` en la base, salvo "Orden personalizado"):
   - **Orden personalizado** (default; usa `playlist_songs.position`),
   - **Número** (`songs.number`),
   - **Título** (`songs.title`),
   - **Categoría** (`categories.name`),
   - **Autor** (`authors.name`),
   - **Agregado recientemente** (`playlist_songs.created_at` desc).

   La elección se guarda por usuario+playlist en `localStorage` (anónimo) o `user_song_keys`-equivalente (autenticado, fuera del MVP).

d. **Nombre** — abre un diálogo simple para editar `playlists.name`. Al guardar persiste y `slug` se mantiene (no se regenera automáticamente para no romper URLs).

### CU-17.2: Quitar canción de una playlist

- **Disparador:** desde el menú contextual "⋯" de una fila de canción dentro de una playlist (CU-23), item **"Quitar de esta playlist"**.
- **Flujo:**
  1. El sistema pide confirmación.
  2. Si el usuario confirma, elimina la fila de `playlist_songs (playlist_id, song_id, position)` y compacta `position` de las restantes.
- **Postcondiciones:** la canción ya no figura en la playlist; sigue existiendo en `songs`.

---

## CU-18: ABM de usuario

- **RF:** RF9
- **Actor primario:** Administrador
- **Precondiciones:** Sesión con rol admin.
- **Disparador:** Acceso a `/admin/usuarios`.
- **Flujo principal:**
  1. El admin lista, crea, edita o desactiva usuarios.
  2. Asigna roles y parroquia.
  3. El sistema persiste los cambios.
- **Flujos alternativos:**
  - 1a. Desactivar al propio usuario: se rechaza.
- **Postcondiciones:** Usuarios actualizados.

### CU-18.1: Crear usuario

- **Disparador:** botón "Nuevo usuario" en `/admin/usuarios`.
- **Campos obligatorios:** `display_name` (nombre), `email`.
- **Campos opcionales:** `parish_id`, lista de roles (`admin`, `editor`, `coordinator`, `member`).
- **Flujo:**
  1. El admin completa el formulario.
  2. El sistema valida que `email` no exista ya en `users` y tenga formato válido.
  3. Se crea el registro en `auth.users` (Supabase Auth, sin contraseña — el usuario activa la cuenta vía OAuth en su primer login con CU-13) y el perfil en `public.users` mediante el trigger `on_auth_user_created`.
  4. Se asignan los roles seleccionados en `user_roles`.
- **Flujos alternativos:**
  - 2a. Email duplicado: se muestra error inline.
  - 4a. Sin roles: el usuario queda con rol `member` por defecto.
- **Postcondiciones:** Usuario creado, en estado `is_active = true`, con sus roles asignados.

---

## CU-19: ABM de parroquia

- **RF:** RF10
- **Actor primario:** Administrador
- **Precondiciones:** Sesión con rol admin.
- **Disparador:** Acceso a `/admin/parroquias`.
- **Flujo principal:**
  1. El admin crea/edita/baja parroquias (nombre, dirección, slug, contacto).
  2. Al crear una nueva, el sistema ofrece **autocompletar desde OpenStreetMap** (CU-19.1).
  3. El sistema valida unicidad del slug (`parishes.slug`).
  4. Persiste los cambios.
- **Flujos alternativos:**
  - 3a. Slug duplicado: el sistema sugiere uno alternativo basado en `slugify(name)` con sufijo numérico.
- **Postcondiciones:** Parroquia persistida.

### CU-19.1: Autocompletar parroquia desde OpenStreetMap (Nominatim)

Al crear una parroquia nueva, el formulario ofrece dos modos de localización usando el servicio gratuito **Nominatim** de OpenStreetMap (sin API key, ver `lib/nominatim.ts`). Las llamadas se proxy-ean por el endpoint server `/api/parroquias/buscar` para respetar el `User-Agent` exigido por la política de uso de Nominatim y evitar CORS.

a. **Por GPS del navegador:** el sistema solicita `navigator.geolocation.getCurrentPosition`. Con las coordenadas, consulta Nominatim acotado a un viewbox de ~2 km alrededor del punto y muestra una lista de candidatos con nombre y dirección. Al elegir uno se prellenan `name`, `address`, `city`.

b. **Por búsqueda de texto:** el admin escribe un nombre/dirección (mínimo 3 caracteres) y se invoca `nominatim.openstreetmap.org/search`. Al elegir un resultado se prellenan los mismos campos.

- **Flujos alternativos:**
  - a.1. El navegador deniega geolocalización: se muestra mensaje y se ofrece el modo (b).
  - a.2. Sin candidatos cercanos: se muestra mensaje "No encontramos parroquias cerca" y se ofrece (b).
  - El admin siempre puede editar manualmente cualquier campo prellenado.
- **Postcondiciones:** Datos prellenados; la parroquia se persiste recién al pulsar "Guardar" del formulario principal (CU-19).

---

## CU-20: Gestionar permisos

- **RF:** RF21
- **Actor primario:** Administrador
- **Precondiciones:** Sesión con rol admin.
- **Disparador:** Acceso a `/admin/permisos`.
- **Flujo principal:**
  1. El admin define roles (editor, coordinador, admin) y sus permisos.
  2. Asigna roles a usuarios.
  3. El sistema persiste y los cambios aplican en la siguiente request (RLS de Supabase).
- **Flujos alternativos:**
  - 1a. Quitar el último admin: se rechaza.
- **Postcondiciones:** Roles y permisos actualizados.

---

## CU-21: Gestionar anuncios y novedades

- **RF:** RF19
- **Actor primario:** Administrador / Coordinador parroquial (según alcance del anuncio).
- **Precondiciones:** Sesión con permiso para anuncios.
- **Disparador:** Acceso a `/admin/anuncios`.
- **Alcance:** este CU cubre tanto los **anuncios** programados (`announcements`) como las **novedades destacadas** (`featured_content`) que aparecen en la home (CU-07).
- **Flujo principal:**
  1. El usuario lista anuncios/novedades existentes con sus ventanas de vigencia.
  2. Crea, edita o da de baja un anuncio: título, cuerpo, fecha de inicio/fin, alcance (global / parroquia), prioridad. Para "novedad" además: `target_kind` (canción, playlist, parroquia, link externo) y referencia.
  3. El sistema valida fechas y alcance.
  4. En la home, durante la ventana de vigencia, los anuncios aparecen como banners cerrables y las novedades en la sección "Novedades" (CU-07).
  5. Al cerrar un banner, no vuelve a aparecer al mismo dispositivo/usuario (`announcement_dismissals`).
- **Flujos alternativos:**
  - 2a. Fecha fin anterior a inicio: error de validación.
  - 2b. Editar un anuncio que ya está visible: el cambio se aplica en la próxima carga; los dismissals previos se mantienen (la unicidad es por `announcement_id`).
- **Postcondiciones:** Anuncio/novedad persistido.

---

## CU-22: Gestionar "Mis favoritos"

- **RF:** RF18
- **Actor primario:** Usuario autenticado
- **Precondiciones:** Sesión activa.
- **Disparador:** clic en el ícono de **corazón** del header (CU-24) o navegación directa a `/favoritos`.
- **Flujo principal:**
  1. El usuario abre Mis Favoritos. Cuando se accede desde el header, se muestra como **diálogo popup** con la lista; en `/favoritos` ocupa la página completa.
  2. El sistema muestra la lista ordenada por **agregados recientemente** (`favorites.created_at` desc). Cada ítem indica su tipo (canción / playlist / parroquia) y enlaza al detalle correspondiente.
  3. Subagrupación opcional por tipo: el popup muestra los tres grupos colapsables — primero canciones, luego playlists, luego parroquias.
  4. El usuario desmarca un ítem haciendo clic en su corazón.
  5. El ítem desaparece de la lista; el cambio se refleja en todas las vistas que lo muestran (CU-15).
- **Flujos alternativos:**
  - 1a. No existen favoritos: el popup muestra texto vacío "Todavía no marcaste favoritos".
  - 1b. Sin sesión: el popup invita a iniciar sesión (CU-13).
- **Postcondiciones:** Lista actualizada en `favorites`.

---

## CU-23: Lista de canciones con badges y menú contextual

- **RF:** RF4
- **Actor primario:** Visitante / Músico / Coordinador parroquial.
- **Precondiciones:** Estar en una vista que muestra una lista de canciones (catálogo `/canciones`, playlist, resultados de búsqueda, "Mis favoritos").
- **Disparador:** El sistema renderiza la lista.
- **Flujo principal:**
  1. Para cada canción, además de número y título, el sistema muestra a la derecha un grupo compacto de **badges** que indican capacidades disponibles. Cada badge tiene tooltip al pasar el cursor:
     - 🎵 nota musical → la canción tiene acordes (`body` con marcadores `[acorde]`).
     - ▶ play → la canción tiene `youtube_url`.
     - 📄 hoja → la canción tiene archivos asociados publicados (`song_files.status = 'published'`: partituras, audios).
     - ❤ corazón (lleno) → la canción está en los favoritos del usuario actual (solo con sesión).
     Solo se muestran los badges que aplican (sin slots vacíos).
  2. Al final de cada fila, a la derecha del todo, un ícono de **tres puntitos horizontales (⋯)**. Al hacer clic abre un menú desplegable con tooltip "Más acciones":
     - **Agregar a playlist** — abre selector de playlists del usuario; al elegir una, la canción se agrega al final de esa playlist (reusa CU-17.1.a).
     - **Ver canción** — equivale a hacer clic en el título (navega a `/canciones/[slug]`).
     - **Compartir** — usa `navigator.share` si está disponible; si no, copia la URL canónica al portapapeles y muestra un toast "Enlace copiado".
     - **Agregar a Mis favoritos** / **Quitar de Mis favoritos** — toggle del corazón (CU-15).
     - **Quitar de esta playlist** — solo presente si el listado es una playlist y el usuario tiene permisos (CU-17.2).
- **Flujos alternativos:**
  - **Sin sesión:** los items "Agregar a playlist" y "Agregar a Mis favoritos" están visibles pero deshabilitados con tooltip "Iniciá sesión para usar esta acción".
  - **Sin permisos sobre la playlist:** "Quitar de esta playlist" no aparece.
- **Postcondiciones:** Ninguna por defecto; las acciones individuales tienen las suyas.

---

## CU-24: Barra de acciones global en el header

- **RF:** RF4, RF18
- **Actor primario:** Cualquier usuario.
- **Precondiciones:** Ninguna.
- **Disparador:** El sistema renderiza el header en cualquier página.
- **Flujo principal:**
  1. En el extremo derecho del header se muestran **tres botones circulares** con tooltips:
     - 🔍 **Buscar** (lupa) → tooltip "Buscar".
     - ❤ **Mis favoritos** (corazón) → tooltip "Mis favoritos".
     - 👤 **Perfil** (silueta de usuario) → tooltip "Mi cuenta".
  2. **Buscar:** abre un overlay/diálogo con un input de búsqueda global. A medida que el usuario tipea, el sistema busca en paralelo en **canciones**, **playlists** y **parroquias** y agrupa resultados por tipo. Al elegir uno, navega al detalle correspondiente (canción → CU-02, playlist → CU-05, parroquia → CU-06.2). Reusa el motor de CU-01.
  3. **Mis favoritos:** abre el diálogo popup de CU-22.
  4. **Perfil:** abre el menú lateral existente (login, modo oscuro, listas, etc.).
- **Flujos alternativos:**
  - **Buscar sin término:** el overlay muestra accesos rápidos (parroquias destacadas, últimas playlists, etc.).
- **Postcondiciones:** Ninguna persistente; las acciones derivadas siguen sus propios CU.

---

## CU-25: Creación de categorías litúrgicas

- **RF:** RF22
- **Actores primarios:** Coordinador parroquial / Editor de contenido / Administrador.
- **Precondiciones:** Sesión activa con uno de esos roles, y estar editando una canción (CU-16, CU-16.1).
- **Disparador:** desde el selector de categoría en el formulario de edición de canción, opción **"+ Nueva categoría"** cuando la categoría buscada no existe.
- **Flujo principal:**
  1. En el formulario de canción (CU-16, CU-16.1), el campo `category_id` ofrece un selector con las categorías ordenadas por `sort_order, name`.
  2. Si la categoría buscada no existe, el usuario hace clic en **"+ Nueva categoría"**.
  3. Se abre un mini-diálogo con los campos `name` (obligatorio), `description` (opcional). `slug` se genera automáticamente con `slugify(name)`; `sort_order` se asigna al final.
  4. Al guardar, la categoría queda persistida en `categories` y se selecciona automáticamente en la canción que se está editando.
  5. El usuario sigue editando la canción sin haber salido del formulario.
- **Flujos alternativos:**
  - 3a (slug duplicado): el sistema sugiere uno alternativo con sufijo numérico (`comunion-2`).
  - 3b (nombre duplicado): el sistema avisa "Ya existe una categoría con ese nombre" y propone seleccionarla en lugar de crear duplicado.
- **Postcondiciones:** Categoría persistida en `categories` y asociada a la canción en edición.

> **Nota:** la **edición y baja** de categorías existentes no está cubierta en este CU y se decidirá más adelante. La FK `songs.category_id` es `ON DELETE SET NULL`, por lo que la baja eventual de una categoría dejaría las canciones asociadas sin categoría.

---

