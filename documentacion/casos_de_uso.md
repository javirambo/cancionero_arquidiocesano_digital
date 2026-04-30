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
| CU-14   | Vincular usuario a parroquia                         | RF17      | [x]   |
| CU-15   | Marcar favoritos                                     | RF18      | [x]   |
| CU-16   | ABM de canción                                       | RF1       |       |
| CU-17   | ABM de playlist                                      | RF2       | [~]   |
| CU-18   | ABM de usuario                                       | RF9       |       |
| CU-19   | ABM de parroquia                                     | RF10      | [x]   |
| CU-20   | Gestionar permisos                                   | RF21      |       |
| CU-21   | Gestionar anuncios                                   | RF19      | [x]   |
| CU-22   | Gestionar "Mis favoritos"                            | RF18      | [x]   |
| CU-23   | Lista de canciones con badges y menú contextual      | RF4       | [x]   |
| CU-24   | Barra de acciones global en el header                | RF4, RF18 | [x]   |
| CU-25   | Creación de categorías litúrgicas                    | RF22      |       |
| CU-26   | ABM de festividades litúrgicas                       | RF23      |       |

---

## Actores del sistema

Hay dos dimensiones que conviven: roles globales (catálogo roles, asignados en user_roles) y vínculo contextual con parroquia (tabla parish_members.role).

1. 👥 Visitante (anónimo, sin sesión)
  Asamblea, fiel cualquiera. No tiene cuenta.
  Puede: buscar (CU-01), ver canciones/letra/acordes (CU-02), reproducir YouTube (CU-04), ver playlists públicas (CU-05), parroquias (CU-06), home/festividad (CU-07), modo coro (CU-08), descargar QR (CU-12), login con Google (CU-13).
  No puede: persistir favoritos, transposiciones por usuario, ni nada de admin.
2. 🎵 Músico / Corista
  No es un rol técnico distinto en la base — es un uso sobre el visitante o sobre un usuario autenticado con rol member. Lo distingue su intención (ejecutar repertorio, ver acordes, transponer).
3. 👤 *member* (autenticado básico)
  Rol global default al loguearse por primera vez (CU-13, CU-18.1).
  Suma sobre el visitante: favoritos (CU-15, CU-22), transposición persistida en user_song_keys (CU-03), vincularse a N parroquias y elegir una principal (CU-14). Crear sus playlists.
4. ⛪ *coordinator* (Coordinador parroquial)
  Rol contextual: se asigna por parroquia en parish_members.role='coordinator'.
  Suma: crear/editar playlists de su parroquia (la que tiene la estrella) (CU-17), crear/editar canciones en estado draft y enviarlas a revisión (CU-16), crear categorías nuevas (CU-25), gestionar anuncios con alcance parroquial (CU-21). Crear parroquia en estado de revision (busca en Maps) el Admin debe aceptar.
  Caso especial: Coordinador pastoral = coordinador de la parroquia virtual arquidiocesis; sus playlists pueden marcarse is_archdiocesan.
5. ✏️ *editor* (Editor de contenido — Comisión Litúrgico-Musical)
  Rol global en user_roles.
  Suma: aprobar/rechazar canciones en estado review (CU-16), publicar nuevas versiones, archivar canciones, crear categorías (CU-25).
6. 👑 *admin* (Administrador)
  Rol global con permisos plenos.
  Suma todo: ABM de parroquias (CU-19), ABM de usuarios y asignación de roles (CU-18), gestión de permisos (CU-20), gestión de eventos litúrgicos, anuncios globales (CU-21), playlists de cualquier parroquia (CU-17).

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
  3. El sistema muestra los **anuncios vigentes** (`announcements` con `now() between starts_at and ends_at`) en la sección "Novedades", ordenados por `priority desc, starts_at desc`. Cada anuncio se muestra una sola vez (sin duplicados aunque el usuario esté en varias parroquias destinatarias). Si tiene atajo (`target_kind` ≠ `'none'`), el banner enlaza al recurso.
  4. **Visibilidad de anuncios:**
     - **Anónimo:** ve únicamente anuncios **globales** (sin filas en `announcement_parishes`).
     - **Autenticado:** ve los globales + los anuncios cuyas parroquias destinatarias intersectan con sus `parish_members`.
  5. El usuario navega al contenido de su interés.
- **Flujos alternativos:**
  - 1a. Sin festividad ni anuncios: la home muestra el tiempo litúrgico calculado y acceso al buscador y al catálogo.
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
- **Disparador:** El usuario abre `/parroquias` y opera sobre las cards de cada parroquia.
- **Modelo:** un usuario puede asociarse a **N parroquias** mediante `parish_members(user_id, parish_id, role='member')`. Adicionalmente puede marcar **una sola** como **principal** (`users.parish_id`).
- **Flujo principal:**
  1. El listado `/parroquias` separa en dos secciones: **"Mis parroquias"** (las asociadas, con la principal arriba marcada con ⭐) y **"Otras parroquias"** (con botón [+] para asociarse).
  2. Click en **[+]** de una parroquia → el sistema inserta `parish_members` con `role='member'`. La parroquia pasa a "Mis parroquias".
  3. Click en **[−]** de una asociada → confirmación + `delete` de `parish_members`. Si era la principal, se limpia automáticamente `users.parish_id`.
  4. Click en la **estrella** de una asociada → setea `users.parish_id` (queda como principal). Click en la estrella ya activa → limpia (queda sin principal).
  5. La parroquia virtual **"arquidiocesis"** se oculta del listado público porque no es una parroquia común; sus playlists ya se ven por todas las parroquias gracias a `is_archdiocesan` (ver CU-17).
- **Postcondiciones:** Filas en `parish_members` y, opcionalmente, `users.parish_id` actualizado.

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
- **Actores primarios:**
  - **Coordinador parroquial:** crea/edita/elimina playlists de su parroquia.
  - **Administrador:** gestiona playlists de cualquier parroquia.
  - **Coordinador pastoral:** coordinador de la parroquia virtual `arquidiocesis`; sus playlists pueden marcarse `is_archdiocesan` y aparecen en todas las parroquias.

### Modelo (estilo Spotify)

- **URL canónica:** `/playlists/{uuid}`. El antiguo `slug` quedó como texto libre y no se usa más en URLs (UNIQUE eliminado por la migración 0006).
- **Dueño:** `playlists.parish_id` (parroquia creadora) + `playlists.created_by` (usuario).
- **Visibilidad:** `playlists.visibility ∈ {public, unlisted, private}`.
- **Compartir entre parroquias:** tabla `playlist_parish_subscriptions(playlist_id, parish_id)`. Otra parroquia puede "suscribirse" a una playlist pública para que aparezca en su listado.
- **Arquidiocesanas:** flag `playlists.is_archdiocesan`. Si está en `true`, la playlist se ve por defecto en el listado de todas las parroquias (sin necesidad de suscripción explícita). Solo se permite marcar `is_archdiocesan` cuando la parroquia dueña es `arquidiocesis`.

### Listados disponibles

- `/playlists` — **"Tus playlists"**: si hay sesión, agrupa las playlists de cada parroquia en la que el usuario es miembro (propias + suscriptas + arquidiocesanas). Sin sesión invita a iniciar sesión. Logueado sin parroquias asociadas, invita a vincularse a una en `/parroquias` (CU-14).
- `/parroquias/{slug}/playlists` — listado completo de playlists asociadas a una parroquia, agrupado en *De esta parroquia / Compartidas / De la Arquidiócesis*. Si el usuario es admin o coordinator de esa parroquia, ve botón **"+ Nueva playlist"**.
- `/parroquias/{slug}` — preview de las 4 últimas playlists con link "Ver todas" cuando hay más.

### Flujo principal — Crear

1. Coordinador (o admin) entra a `/parroquias/{slug}/playlists/nueva`.
2. Completa nombre (obligatorio), descripción, fecha del evento, visibilidad, y opcionalmente `is_archdiocesan` (solo visible si la parroquia es `arquidiocesis`).
3. Al guardar, el sistema redirige a `/playlists/{nuevo-id}/editar`.
4. En la pantalla de edición, abajo aparece el editor de canciones (CU-17.1.a).

### Flujo principal — Editar metadatos / eliminar

- En `/playlists/{id}` aparece botón **"Editar playlist"** si el usuario es admin o coordinator de la parroquia dueña.
- En `/playlists/{id}/editar`:
  - Sección **"Datos"**: nombre, descripción, fecha, visibilidad, `is_archdiocesan`. Botón **Guardar** persiste y vuelve a `/playlists/{id}`.
  - Botón **"Eliminar playlist"**: pide confirmación con `window.confirm`. Borrado físico (`playlist_songs` se borra por `ON DELETE CASCADE`). Tras eliminar, redirige al listado de la parroquia.

### Flujos alternativos

- 1a. Sin permisos sobre la parroquia: el sistema rechaza la operación (RLS) y/o la pantalla redirige.
- Eliminación de playlist con suscripciones: las filas en `playlist_parish_subscriptions` se borran por CASCADE.

### CU-17.1: Edición de canciones dentro de la playlist

En `/playlists/{id}/editar`, sección **"Canciones"** (Tanda 1 implementada):

a. **Buscador "Agregar canción"** — input que consulta `/api/songs/buscar` (mismo motor que CU-01, accent-insensitive vía RPC `search_songs`). Al elegir un resultado, se inserta en `playlist_songs` con `position = max(position)+1`.

b. **Listado actual** — cada fila muestra `[posición] [número] [título] [Quitar]`. Click en **Quitar** pide confirmación y elimina la fila.

c. *(Pendiente — Tanda 2)* **Edición en lote** con drag para reordenar y marcado para eliminación múltiple.

### CU-17.2: Quitar canción de una playlist

- **Disparador:** botón **Quitar** en cada fila del editor de canciones (`/playlists/{id}/editar`).
- **Flujo:** confirmación + `delete from playlist_songs where playlist_id=… and song_id=… and position=…`.
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

## CU-21: Gestionar anuncios

- **RF:** RF19
- **Actor primario:** Administrador.
- **Precondiciones:** Sesión con rol admin.
- **Disparador:** Acceso a `/admin/anuncios`.
- **Alcance:** "anuncio" y "novedad" son el mismo concepto. Un anuncio es una pieza de contenido con ventana de vigencia (`starts_at` → `ends_at`) que aparece en la home (CU-07). Solo el Administrador los gestiona; los usuarios finales no pueden cerrarlos ni ocultarlos: el anuncio desaparece automáticamente al pasar `ends_at`.

### Modelo

- **Vigencia:** `now() between starts_at and ends_at`. No hay flag de activo/inactivo: la vigencia es estrictamente temporal.
- **Atajo opcional (banner clickeable):** `target_kind ∈ ('song','playlist','parish','external','none')` + `target_id` o `target_url`. Si está definido, el banner enlaza al recurso correspondiente. Si `target_kind='none'`, el anuncio es solo informativo.
- **Destinatarios:** tabla N–N `announcement_parishes(announcement_id, parish_id)`.
  - Sin filas → **anuncio global** (lo ven todos: anónimos y autenticados).
  - Con filas → **anuncio dirigido**: lo ven únicamente los usuarios autenticados asociados (vía `parish_members`) a alguna de esas parroquias. Los anónimos **no** lo ven.
- **Deduplicación:** un mismo anuncio se muestra una sola vez al usuario, aunque esté asociado a múltiples parroquias destinatarias.

### Flujo principal — Crear

1. El admin entra a `/admin/anuncios/nuevo`.
2. Completa: `title` (obligatorio), `body` (opcional), `starts_at`, `ends_at`, `priority`.
3. Selecciona destinatarios:
   - **Todas las parroquias** (default) — no se insertan filas en `announcement_parishes`.
   - **Parroquias específicas** — selector multi-select. Debe elegir al menos una.
4. Opcionalmente define un atajo: tipo de recurso + selección (búsqueda del recurso o URL externa).
5. Al guardar, se inserta la fila en `announcements` y, si corresponde, las filas en `announcement_parishes`.

### Flujo principal — Editar

1. Desde el listado, el admin abre un anuncio existente (vigente, futuro o vencido).
2. Puede modificar cualquier campo, incluido el set de parroquias destinatarias y la fecha de fin.
3. Al guardar, los cambios se aplican inmediatamente en la próxima carga de la home.

### Flujo principal — Eliminar

1. Desde el listado o desde el detalle, el admin pulsa "Eliminar".
2. Confirmación con `window.confirm`.
3. Borrado físico de `announcements` (las filas en `announcement_parishes` caen por `ON DELETE CASCADE`). Se permite eliminar anuncios vigentes, futuros o vencidos.

### Listados disponibles

- `/admin/anuncios` — listado server-side, agrupado en **vigentes** (vigencia atravesando ahora), **programados** (futuros) y **vencidos** (pasados). Cada fila muestra título, ventana de fechas y destinatarios (badge "Todas" o lista de slugs). Botón "+ Nuevo anuncio".

### Flujos alternativos

- 2a. **`ends_at <= starts_at`** → error de validación inline; no se permite guardar.
- 3a. **Selección "específicas" sin elegir ninguna parroquia** → error de validación.
- 4a. **Atajo con tipo `song`/`playlist`/`parish` y `target_id` ausente** → error de validación.
- 4b. **Atajo con tipo `external` y `target_url` inválida** → error de validación.

### Postcondiciones

- Anuncio persistido en `announcements` y, si aplica, sus destinatarios en `announcement_parishes`.
- Visible en la home (CU-07) durante su ventana de vigencia, según las reglas de visibilidad descriptas arriba.

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

## CU-26: ABM de festividades litúrgicas

- **RF:** RF23
- **Actor primario:** Administrador.
- **Precondiciones:** Sesión con rol admin.
- **Disparador:** acceso a `/admin/eventos-liturgicos`.
- **Flujo principal:**
  1. El admin lista las festividades cargadas en `liturgical_events` ordenadas por `event_date`. Filtros básicos: año, tipo (`solemnidad`, `fiesta`, `memoria`, `tiempo`, `otro`).
  2. Crea/edita/elimina entradas con: `name`, `slug` (autogenerado), `event_date` (fecha concreta), `kind`, `description`, `playlist_id` opcional (sugerencia de repertorio para esa fecha).
  3. El sistema valida unicidad de `slug` y que `event_date` sea válida.
  4. Persiste los cambios.
- **Comportamiento en home (CU-07):** la festividad cargada en `liturgical_events` para `event_date = hoy` tiene **prioridad** sobre la festividad calculada por la librería `romcal`. Esto permite controlar nombre, descripción y playlist asociada en español argentino.
- **Flujos alternativos:**
  - 3a (slug duplicado): el sistema sugiere uno alternativo con sufijo numérico.
  - Baja con playlist asociada: la FK `liturgical_events.playlist_id` es `ON DELETE SET NULL`, por lo que borrar la playlist no elimina el evento.
- **Postcondiciones:** Evento persistido en `liturgical_events`.

### CU-26.1: Importación automática del calendario litúrgico

Para evitar carga manual año tras año, el sistema ofrece una **importación masiva** desde una fuente externa.

- **Fuentes posibles** (a evaluar al implementar):
  - **Conferencia Episcopal Argentina** ([episcopado.org](https://episcopado.org) — sección liturgia): publica el calendario en HTML. Requiere scraping.
  - **Vaticano** ([vatican.va](https://www.vatican.va)): calendario universal en HTML, también scraping.
  - **divinumofficium.com**: calendario tradicional, HTML.
  - **iCal feeds litúrgicos** (catholic-resources.org, universalis.com): formato `.ics` parseable.
  - **romcal** (librería ya instalada): generación local sin red, pero sin locale español. Puede combinarse con un mapa de traducción y servir como base, sobreescribiendo los nombres con scraping si se prefiere.
- **Disparador:** botón **"Importar calendario {año}"** en `/admin/eventos-liturgicos`.
- **Flujo:**
  1. El admin elige el año (default: año en curso).
  2. El sistema obtiene el calendario desde la fuente configurada (server-side; el scraping se hace en un endpoint Next.js, no desde el browser).
  3. Se previsualizan las entradas que se van a crear, marcando duplicados con respecto a lo ya cargado (mismo `slug` o misma `event_date`).
  4. El admin confirma. Las entradas se insertan con `on conflict do nothing` para no pisar ediciones manuales.
  5. Al finalizar se muestra un resumen: *N creadas, M omitidas (duplicadas), K errores*.
- **Flujos alternativos:**
  - La fuente externa cae o cambia su formato → el sistema marca el error y permite reintentar; las entradas ya existentes no se tocan.
- **Postcondiciones:** Múltiples filas en `liturgical_events`. La carga manual sigue siendo posible para corregir nombres/descripciones.

> **Nota:** la elección de la fuente y el parser específico se decidirá al implementar el CU. El scraping de sitios oficiales requiere respetar `robots.txt` y aplicar caching agresivo (los calendarios cambian anualmente, no diariamente).

---

