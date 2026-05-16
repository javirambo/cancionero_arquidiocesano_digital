# CASOS DE USO — Cancionero Arquidiocesano Digital

Este documento detalla los casos de uso del sistema, derivados de los requerimientos funcionales (RF) descriptos en [`especificacion_tecnica.md`](especificacion_tecnica.md) §5.1.

---

## Índice

| ID      | Nombre                                               | RF        | Estado |
| ------- | ---------------------------------------------------- | --------- | ------ |
| CU-01   | Buscar cualquier cosa (parroquia, canción, playlist) | RF4       | ✅     |
| CU-02.1 | Ver canción con letra                                | RF5       | ✅     |
| CU-02.2 | Ver canción con letra y acordes                      | RF5       | ✅     |
| CU-03   | Transponer tonalidad                                 | RF6       | ✅     |
| CU-04   | Reproducir referencia de YouTube                     | RF8       | ✅     |
| CU-05   | Ver playlist de parroquia                            | RF3, RF12 | ✅     |
| CU-06.1 | Buscar parroquia                                     | RF11      | ✅     |
| CU-06.2 | Acceder a parroquia por URL                          | RF11      | ✅     |
| CU-07   | Visualizar novedades / festividad del día            | —         | ✅     |
| CU-08   | Silenciar dispositivo y mantener pantalla            | RF20      | ✅     |
| CU-09   | Descargar archivos de la canción                     | RF7       | ✅     |
| CU-10   | Descargar canción para imprimir                      | RF14      | ✅     |
| CU-11   | Descargar playlist como cancionero                   | RF15      | ⏳     |
| CU-12   | Descargar QR de la página actual                     | RF13      | ✅     |
| CU-13   | Login con Google                                     | RF16      | ✅     |
| CU-14   | Vincular usuario a parroquia                         | RF17      | ✅     |
| CU-15   | Marcar favoritos                                     | RF18      | ✅     |
| CU-16   | ABM de canción                                       | RF1       | ✅     |
| CU-17   | ABM de playlist                                      | RF2       | ✅     |
| CU-18   | ABM de usuario                                       | RF9       | ✅     |
| CU-19   | ABM de parroquia                                     | RF10      | ✅     |
| CU-20   | Gestionar permisos o roles                           | RF21      | ✅     |
| CU-21   | Gestionar anuncios                                   | RF19      | ✅     |
| CU-22   | Gestionar "Mis favoritos"                            | RF18      | ✅     |
| CU-23   | Lista de canciones con badges y menú contextual      | RF4       | ✅     |
| CU-24   | Barra de acciones global en el header                | RF4, RF18 | ✅     |
| CU-25   | Gestión de categorías litúrgicas                     | RF22      | ✅     |
| CU-26   | Pagina de creditos y de privacidad                   |           | ✅     |


---

## Actores del sistema

> **Matriz vigente desde 2026-05-15** (ver bloque "Refactor de roles 2026-05-15" en `Pendientes.md`).

Hay dos dimensiones que conviven: **roles globales** (catálogo `roles`, asignados en `user_roles`) y **vínculo contextual con parroquia** (`parish_members.role`).

### 1. 👥 Fiel / Invitado (anónimo, sin sesión)

Asamblea o fiel cualquiera. No tiene cuenta. **Caso de uso central:** escanear un QR pegado en un banco de la iglesia y ver la playlist de la celebración.

- **Puede:** buscar (CU-01), ver canciones (CU-02) **con acordes** y **transponer** (transposición persistida en `localStorage` — CU-03), reproducir YouTube (CU-04), ver **todas las parroquias** (CU-06) — sin filtro por `status` (mig. 0035 abrió la lectura), entrar a la página de cualquier parroquia y ver **todas las listas y anuncios** de esa parroquia, ver **playlists arquidiocesanas** y **anuncios globales** en la home y en `/playlists`/`/anuncios`, modo coro (CU-08), descargar QR (CU-12), favoritear (CU-15) — **persistido en `localStorage`**, no en BD. En `/parroquias/{slug}` ve mails de **coordinator parroquial**.
- **NO puede:** crear/editar nada, asociarse a parroquias (la transposición y los favoritos no se sincronizan entre dispositivos).
- **Migración al loguearse:** al hacer su primer login (CU-13), los favoritos guardados en `localStorage` se transfieren a `favorites` en BD.

### 2. 🎵 Músico / Corista

No es un rol técnico distinto: es un patrón de uso del visitante o del `member`. Lo distingue su intención (ejecutar repertorio, ver acordes, transponer). Si quiere persistir transposiciones o crear playlists, debe loguearse y queda como `member`.

### 3. 👤 *member* (autenticado básico)

Rol global default al loguearse por primera vez (CU-13, CU-18.1). Es el "fiel" que decide formar parte del cancionero, o el músico/corista que quiere personalizar.

- **Suma sobre el invitado:**
  - Ver acordes y transponer; transposición persistida en `user_song_keys` (CU-03).
  - Favoritos persistidos en BD (CU-15, CU-22).
  - Vincularse a N parroquias y elegir una principal con ⭐ (CU-14).
  - **Crear playlists personales** (`parish_id = NULL`) — esté o no asociado a una parroquia. Las puede compartir por URL.
- **Ve en la home:** anuncios globales + anuncios scoped a sus `parish_members`, y playlists de sus parroquias asociadas + arquidiocesanas (con dedupe). En `/playlists` y `/anuncios`: también los de sus parroquias. Las listas/anuncios de otras parroquias no aparecen en la home pero se pueden ver entrando a `/parroquias/{slug}`. En `/parroquias/{slug}`: ve mails de **coordinator parroquial**.
- **NO puede:** crear canciones, crear playlists de parroquia, crear anuncios, crear parroquias.

### 4. ⛪ *coordinator* (Coordinador parroquial)

Rol contextual: se asigna por parroquia en `parish_members.role='coordinator'`. Un mismo usuario puede ser coordinator en varias parroquias.

- **Suma sobre member:**
  - Crear/editar **playlists de su parroquia** (CU-17). Si tiene varias parroquias, debe seleccionar a cuál asignar la playlist.
  - Crear **anuncios dirigidos a su(s) parroquia(s)** (CU-21). NO puede crear anuncios globales.
- **En `/parroquias/{slug}`:** ve mails de **editor + admin**.
- **NO puede:** crear/editar canciones (mig. 0037), crear parroquias, crear anuncios globales, administrar usuarios.

### 5. ✏️ *editor* (Editor de contenido — Comisión Litúrgico-Musical)

Rol global en `user_roles`.

- **Suma sobre coordinator:**
  - Crear/editar/borrar/archivar **canciones** y todo el flujo editorial `draft → review → published` (CU-16). Puede aprobar/rechazar canciones en review.
  - Crear/editar/borrar **`song_files`** (partituras, audios) asociados a canciones.
  - Crear/editar/borrar **parroquias** (CU-19).
  - Crear **anuncios globales** (sin destinatarios específicos) (CU-21).
  - Asignar múltiples categorías litúrgicas a una canción (CU-25). El ABM del catálogo `categories` se gestiona hoy por SQL (catálogo estable).
- **Caso especial — coordinator de `arquidiocesis`:** el editor es **siempre y automáticamente** coordinator de la parroquia virtual `arquidiocesis`. Solo el editor puede marcar playlists con `is_archdiocesan = true` (visibles por defecto en todas las parroquias).
- **En `/parroquias/{slug}`:** ve mails de **admin**.
- **NO puede:** administrar usuarios (CU-18), gestionar permisos/roles (CU-20), reasignar `parish_id` de playlists.

### 6. 👑 *admin* (Administrador)

Rol global con permisos plenos. Puede todo lo del editor +:

- **Cuando crea cosas que requieren parroquia (canciones, playlists, etc.), se le pregunta a qué parroquia asignar** — no se asume ninguna por defecto.
- **Reasignar dueño** de una playlist: cambiar `parish_id`, incluso convertir personal (`NULL`) → de parroquia, o de parroquia → otra parroquia, o de parroquia → personal.
- **Gestiona:**
  - ABM de usuarios y asignación de roles globales (CU-18).
  - Gestión de permisos (CU-20).
  - Mover usuarios entre parroquias.
- **En `/parroquias/{slug}`:** no ve sección de contactos.

---

## CU-01: Buscar cualquier cosa (parroquia, cancion, playlist)

- **RF:** RF4
- **Actor primario:** Visitante / Músico
- **Precondiciones:** Catálogo de canciones cargado.
- **Disparador:** El usuario escribe en el campo de búsqueda.
- **Flujo principal:**
  1. El usuario ingresa un término (título, fragmento de letra, número, playlist, nombre de categoría litúrgica, parroquia).
  2. El sistema consulta el catálogo y devuelve resultados ordenados por relevancia.
  3. El usuario selecciona una canción.
  4. El sistema navega a la vista de canción (CU-02).
  5. Si es una playlist, se muestra la playlist en lugar de la cancion (CU-05).
  6. Si es una parroquia, se muestra la parroquia (CU-06.2)
- **Flujos alternativos:**
  - 2a. Sin resultados: el sistema muestra mensaje "No se encontraron canciones" y sugerencias de categorías.
  - 2b. Búsqueda vacía: el sistema muestra el catálogo completo paginado.
  - 2c. **Filtro por categoría litúrgica:** el componente `SongsFrame` (catálogo `/canciones` y bloque "Cantos" de la home) ofrece un botón de filtros (ícono embudo) que despliega chips de categorías. Tocar un chip restringe el listado/búsqueda a las canciones de esa categoría (resuelta server-side cruzando `song_categories` por `slug`); volver a tocarlo lo quita. El filtro convive con la búsqueda y con la paginación, y se transmite como query string `cat=<slug>` a `/api/songs/paged`.
- **Postcondiciones:** Ninguna persistente.

---

## CU-02.1: Ver canción con letra

- **RF:** RF5
- **Actor primario:** Visitante
- **Precondiciones:** La canción existe en el catálogo.
- **Disparador:** El usuario navega a `/canciones/{id}` (o desde búsqueda/playlist).
- **Flujo principal:**
  1. El sistema carga la canción: título, autor, categorías litúrgicas (chips, una o varias), letra, acordes y link de YouTube si existe.
  2. El sistema renderiza letra sin acordes.
  3. El usuario puede alternar la visibilidad de los acordes.
- **Flujos alternativos:**
  - 1a. Canción inexistente: el sistema muestra 404.
  - 3a. Canción sin acordes: el toggle queda deshabilitado.
- **Postcondiciones:** Ninguna persistente.

---

## CU-02.2: Ver canción con letra y acordes

- **RF:** RF5
- **Actores primarios:** Músico / Invitado (cualquiera con o sin sesión).
- **Precondiciones:** La canción existe en el catálogo y tiene acordes (`body` con marcadores `[acorde]`).
- **Disparador:** El usuario navega a `/canciones/{id}` (o desde búsqueda/playlist).
- **Flujo principal:**
  1. El sistema carga la canción: título, autor, categorías litúrgicas (chips, una o varias), letra, acordes y link de YouTube si existe.
  2. El sistema renderiza letra con acordes alineados sobre las sílabas correspondientes.
  3. El usuario puede alternar la visibilidad de los acordes.
- **Flujos alternativos:**
  - 1a. Canción inexistente: el sistema muestra 404.
  - 3a. Canción sin acordes: el toggle queda deshabilitado.
- **Postcondiciones:** Ninguna persistente (la preferencia de mostrar/ocultar acordes se guarda en localStorage también para invitado).

---

## CU-03: Transponer tonalidad

- **RF:** RF6
- **Actores primarios:** Cualquier usuario (incluso invitado anónimo).
- **Precondiciones:** Estar en la vista de canción con acordes (CU-02.2).
- **Disparador:** El usuario hace clic en + / − del selector de tono.
- **Flujo principal:**
  1. El usuario solicita subir o bajar un semitono (o seleccionar un tono específico).
  2. El sistema recalcula todos los acordes manteniendo la relación armónica.
  3. El sistema renderiza los acordes en la nueva tonalidad y muestra el delta respecto del original.
  4. El usuario puede restablecer al tono original.
- **Flujos alternativos:**
  - 2a. Acorde no estándar: el sistema preserva el acorde tal cual y registra advertencia (no bloqueante).
  - 1a (autenticado). El tono elegido se persiste en `user_song_keys` (server-side) y queda asociado a su cuenta; al volver a abrir la canción desde cualquier dispositivo se restaura automáticamente.
  - 1b (invitado). El tono elegido se persiste en `localStorage` del navegador (`song:transpose:{songId}`). Es local al dispositivo y se pierde al limpiar datos del navegador.
- **Precedencia del tono inicial al abrir una canción** (de mayor a menor prioridad):
  1. **Contexto de playlist** — si la canción se abre desde una playlist y `playlist_songs.key_override` está definido, se usa ese tono. El coordinador armó la playlist pensando esa tonalidad para la celebración.
  2. **Preferencia del usuario** — `user_song_keys` (autenticado) o `localStorage` (invitado).
  3. **Tono original** — `songs.original_key`.
  - Si el usuario transpone mientras está en contexto de playlist, el cambio se aplica solo a la sesión actual y **no** sobreescribe `playlist_songs.key_override` ni la preferencia persistida.
- **Postcondiciones:**
  - Fuera de playlist (autenticado): tono guardado en `user_song_keys (user_id, song_id)` y disponible en cualquier dispositivo.
  - Fuera de playlist (invitado): tono guardado en `localStorage`, local al dispositivo.
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
  1. El sistema carga la playlist: nombre, parroquia, lista ordenada de canciones.
  2. El usuario puede entrar a cada canción (CU-02) sin perder el orden de la playlist.
  3. El sistema ofrece navegación "anterior / siguiente" dentro de la playlist.
- **Flujos alternativos:**
  - 1a. Playlist inexistente: 404.
- **Postcondiciones:** Ninguna persistente.

> **Vigencia temporal:** una playlist puede tener reglas de vigencia configuradas (ver CU-17). Si las tiene y *ahora* no estamos dentro de su ventana, la playlist no aparece en listados públicos. Igualmente, abrir directamente la URL `/playlists/{id}` la muestra (mismo criterio que `unlisted` y `private`).

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
  1. El sistema busca un anuncio con `kind in ('solemnidad','fiesta','memoria','tiempo','indicaciones')` cuya **vigencia** (en `entity_schedules`, evaluada en hora AR) incluya el momento actual. Si existe, lo muestra como "Festividad de hoy" con su descripción y atajo a la playlist asociada (si aplica). Si hay varias, gana la de mayor `priority`.
  2. *(Pausado)* Cálculo automático con `romcal` cuando no hay festividad cargada — se moverá a una página dedicada "¿Qué hay hoy de nuevo?" en una iteración posterior.
  3. El sistema muestra los **anuncios comunes vigentes** (`announcements` con `kind is null` cuya vigencia en `entity_schedules` matchee el momento actual) en la sección "Novedades", ordenados por `priority desc`. Cada anuncio se muestra una sola vez (sin duplicados aunque el usuario esté en varias parroquias destinatarias). Si tiene atajo (`target_kind` ≠ `'none'`), el banner enlaza al recurso.
  4. **Visibilidad de anuncios y listas en la home (filtro de audiencia, client-side):**
     - **Anónimo:** ve únicamente anuncios **globales** (sin filas en `announcement_parishes`) y playlists **arquidiocesanas**. Las listas/anuncios de una parroquia específica solo se ven entrando a `/parroquias/{slug}`.
     - **Autenticado (member o superior):** ve los anuncios globales + los anuncios scoped a alguna de sus `parish_members`. Idem para listas: las de sus parroquias asociadas + arquidiocesanas (con dedupe).
     - **RLS:** la base de datos abre la lectura a todos (mig. 0035) para que la página de parroquia funcione para invitados. El filtro de audiencia es responsabilidad de los loaders de la home y `/novedades`.
  5. **Popup destacado:** si existe un anuncio con `featured=true` que aplique a la audiencia y esté vigente, se muestra como **modal fullscreen** sobre la home al cargar la página (con botón X y cierre por backdrop/Esc). Si hay varios, gana el de mayor `priority`. El popup también aparece en el grid normal.
  6. El usuario navega al contenido de su interés.
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

## CU-09: Descargar archivos de la canción

- **RF:** RF7
- **Actor primario:** Músico
- **Precondiciones:** La canción está en estado `published` y tiene al menos un archivo en `song_files` (kind: `score_pdf`, `audio_mp3`, `audio_ogg` u `other`) almacenado en los buckets `partituras` o `audios`.
- **Disparador:** El usuario abre la lista de archivos descargables desde:
  - El botón de descarga (ícono ↓) en la toolbar de la vista pública de canción `/canciones/[slug]`.
  - El ítem "Descargar archivos" del menú "..." de cada fila de canción en los listados (catálogo, playlists, favoritos).
- **Flujo principal:**
  1. El sistema lista todos los archivos de la canción, mostrando etiqueta y tipo (Partitura / Audio / Otro).
  2. El usuario selecciona un archivo.
  3. El sistema solicita una URL firmada al bucket correspondiente (`partituras` o `audios`) con expiración corta y nombre de archivo sugerido (basado en el label del archivo o el título de la canción).
  4. El navegador descarga el archivo.
- **Flujos alternativos:**
  - 1a. Sin archivos en la canción: el botón/ítem no aparece (se decide a partir de `hasFiles`, calculado en `lib/songs.ts` y `lib/playlists.ts`).
  - 1b. Falla la carga del listado o la firma: se muestra mensaje de error en el panel.
- **Postcondiciones:** Ninguna persistente.
- **Notas de implementación:**
  - El admin elige el tipo (Partitura / Audio / Otro) al subir cada archivo en el editor de canción (`app/admin/canciones/[id]/editar/files-section.tsx`); eso determina el `kind` y el bucket destino.
  - Los archivos no tienen status propio: la visibilidad pública deriva del `status` de la canción (ver migración `0017_song_files_remove_status` y nota en `modelo_de_datos.md` → `song_files`).
  - En la vista pública la lista se abre como dropdown adyacente al botón.
  - En los menús "..." de fila (`app/components/song-row.tsx`), la lista se renderiza como **vista interna** del mismo dropdown (mismo patrón que "Agregar a playlist") para evitar problemas de clipping con `overflow-hidden`. El componente reusable es `DownloadFilesPanel` en `app/components/download-files-menu.tsx`.

---

## CU-10: Descargar canción para imprimir

- **RF:** RF14
- **Actor primario:** Músico
- **Precondiciones:** Estar en la vista de canción.
- **Disparador:** Desde el menú "Descargar" elige "Imprimir con acordes #" o "Imprimir sin acordes". La opción "con acordes" sólo aparece si la canción tiene acordes y el usuario está autenticado (CU-03).
- **Flujo principal:**
  1. Navega a `/canciones/[slug]/imprimir?chords=…&semitones=…&system=…` (vista de impresión dedicada, sin header ni footer del sitio).
  2. La vista renderiza la canción en formato A4 (margen 1.5cm, tipografía Cardo, título en mayúscula rojo) usando los semitonos/sistema actuales del usuario en pantalla (es decir, imprime lo transpuesto, no el original).
  3. Auto-shrink JS: empieza en 11pt y baja en pasos de 0.5pt hasta que el contenido entra en una hoja, con piso en 9pt. Si al mínimo aún no entra, fluye a 2+ páginas (paginado natural del navegador).
  4. Llama automáticamente a `window.print()`. El usuario decide en el diálogo del navegador si imprime físicamente o guarda como PDF.
- **Flujos alternativos:**
  - 4a. El usuario cancela el diálogo de impresión: queda en la vista, con un botón "Imprimir" para reintentar y "← Volver" para ir a la canción.
- **Postcondiciones:** Ninguna persistente.
- **Notas técnicas:** No se genera PDF server-side; se usa CSS print + `window.print()` del navegador. La vista vive en el route group `(print)` para no heredar el chrome del sitio (header/footer/toolbar).
  - Vista `/imprimir` con CSS print + auto-shrink en una hoja A4 (mínimo 9pt).

---

## CU-11: Descargar playlist como cancionero

- **RF:** RF15
- **Actor primario:** Coordinador parroquial / Músico
- **Precondiciones:** La playlist tiene al menos una canción.
- **Disparador:** El usuario elige "Descargar cancionero" desde la vista de playlist.
- **Flujo principal:**
  1. El usuario elige opciones (con/sin acordes, tamaño A4, índice sí/no, respetar numeración si/no).
  2. El sistema arma un PDF concatenando cada canción con portada (nombre de parroquia) e índice, usando numeración original o enumerando desde 1.
  3. El navegador descarga el archivo.
- **Flujos alternativos:**
  - 2a. Una canción no se puede renderizar: se omite y se reporta en el índice como faltante.
- **Postcondiciones:** Ninguna persistente.
  - ⏳ PDF/print de todas las canciones de la playlist, con preview. Colocar el botón de descarga cuando se está visualizando la playlist. 
  - Hacer menu con opciones antes de renderizar.

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
- **Postcondiciones:** Sesión activa. Si es la primera vez:
  - Se crea el registro en `users` (vía trigger `on_auth_user_created`).
  - **Migración de favoritos de invitado:** los favoritos guardados en `localStorage` durante la navegación anónima se transfieren a `favorites` en BD y se borran del `localStorage`. Si un favorito ya existía en BD (poco probable en primer login), se ignora el duplicado.

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
- **Actor primario:** Visitante o usuario autenticado.
- **Precondiciones:** Ninguna (también funciona sin sesión).
- **Disparador:** El usuario hace clic en el ícono de corazón presente en:
  - la página de detalle de una canción, playlist o parroquia,
  - el menú contextual "⋯" de un ítem de listado (CU-23),
  - el botón "Agregar a Mis favoritos" del menú contextual.
- **Flujo principal (autenticado):**
  1. El sistema registra el like del usuario sobre el recurso (`favorites (user_id, target_kind, target_id)`).
  2. El ícono de corazón pasa a estado "lleno" en todas las vistas que muestran ese recurso.
  3. El recurso aparece en la sección "Mis favoritos" (CU-22) ordenado por fecha de marca descendente.
  4. El usuario puede quitar el favorito desde cualquiera de los puntos de entrada (toggle).
- **Flujos alternativos:**
  - 1a. **Visitante (sin sesión):** el ícono de corazón funciona igual y se persiste en `localStorage` del navegador (no en BD). Al loguearse por primera vez, los favoritos guardados en `localStorage` se transfieren a `favorites` (ver CU-13).
- **Postcondiciones:** Like persistido o eliminado: en `favorites` (autenticado) o en `localStorage` (invitado).

---

## CU-16: ABM de canción (flujo editorial `draft → review → published`)

- **RF:** RF1
- **Actores primarios:**
  - **Editor de contenido:** crea, edita, aprueba.
  - **Admin:** mismas capacidades que Editor.
- **Precondiciones:** Sesión activa con rol Editor o Admin.
- **Disparadores:**
  - Editor/Admin: accede a `/admin/canciones` para crear, editar o revisar.

> **Cambio 2026-05-15:** el rol Coordinador parroquial ya NO puede crear ni editar canciones. Solo Editor/Admin gestionan el cantoral. El coordinador conserva la lectura de canciones publicadas como cualquier usuario.

### Flujo principal — Editor/Admin (crea y publica)

1. El editor crea una canción nueva o edita una existente: título, autor, categorías litúrgicas (una o varias, vía chips clicables), letra, acordes (ChordPro), tonalidad original, tempo, link YT, partituras y audios. **Alta:** el botón "+ Nuevo" llama al RPC `create_blank_song` (mig. 0024, restringido a editor/admin desde mig. 0037), que asigna automáticamente el siguiente número (`max(number) + 1` sobre todos los estados, con `pg_advisory_xact_lock` para evitar carreras) y redirige al editor con la canción ya creada en `draft`. Los huecos no se reusan.
2. El sistema valida formato de acordes y campos obligatorios.
3. El sistema sube los archivos a Supabase Storage (`partituras`, `audios`) en estado `draft` (no son visibles públicamente).
4. La canción queda persistida con `status = 'draft'`. El editor puede seguir editándola.
5. Cuando considera que está lista, puede enviarla a revisión (paso opcional cuando hay un segundo editor que valida) o publicarla directamente.
6. **Aprobar / publicar:** el sistema cambia `status` a `'published'`, registra `reviewed_by`, `reviewed_at`, `published_at`, inserta snapshot en `song_versions` e incrementa `songs.current_version`. Los archivos asociados (`song_files`) pasan también a `'published'`. La canción aparece en búsquedas (CU-01) y vistas públicas (CU-02).
7. **Rechazar (cuando se usó review):** el editor escribe `review_notes` (obligatorio); el sistema cambia `status` a `'rejected'` y registra `reviewed_by`/`reviewed_at`. Otro editor puede retomarla.

### Flujos alternativos

- **2a (validación):** Acordes mal formados → error inline; no se permite enviar a revisión ni publicar.
- **Sin permisos:** Un usuario sin rol Editor/Admin no puede acceder a `/admin/canciones` (UI redirige + RLS rechaza). El coordinador parroquial queda fuera.
- **Baja lógica (`archived`):** Solo Editor o Admin pueden archivar (RPC `archive_song`, mig. 0022). Se confirma con doble paso (dos `confirm` consecutivos en la UI). La transición es válida desde cualquier estado salvo `archived`. Las playlists que la contenían marcan la canción como "no disponible" y dejan de mostrarla en vistas públicas; el historial de `song_versions` se preserva. El archivado/Eliminado limpia los campos de flujo (`submitted_*`, `reviewed_*`, `published_at`, `review_notes`).
- **Reverso (`unarchive_song`):** Editor o Admin pueden desarchivar; la canción vuelve a `draft` y debe pasar por el flujo de revisión si quiere republicarse.
- **Edición de canción ya publicada:** la realiza directamente el Editor (o Admin) sin pasar por el flujo `draft → review`. La canción permanece en `published`.

### Postcondiciones

- Canción persistida en `songs` con su estado actual.
- Si fue aprobada: nueva fila en `song_versions` con `published_at`, `current_version` incrementado, archivos en Storage públicos.
- Traza completa de la transición editorial (`submitted_by/at`, `reviewed_by/at`, `review_notes`).

### CU-16.1: Editar canción (sin acordes)

Edición rápida de una canción cuando solo se modifica la letra y los metadatos, sin tocar acordes.

- **Disparador:** desde la vista de canción o desde `/admin/canciones`, opción "Editar".
- **Campos editables:** `title`, `number`, `author_id`, categorías litúrgicas (relación N:M `song_categories`), `body` (solo letra, sin marcadores `[acorde]`), `tempo_bpm`, `youtube_url`.
- **Flujo:** la edición la realiza el Editor/Admin directamente sobre la canción. Si estaba `published`, sigue `published` (no se re-genera flujo draft→review). Si estaba en `draft`/`rejected`, se sobrescribe.
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
  - **Coordinator parroquial:** crea/edita/elimina playlists de su parroquia.
  - **Editor:** además gestiona playlists arquidiocesanas (`is_archdiocesan=true`) por ser siempre coordinator de la parroquia virtual `arquidiocesis`.
  - **Admin:** gestiona playlists de cualquier parroquia y puede reasignar `parish_id`.

### Modelo (estilo Spotify)

- **URL canónica:** `/playlists/{uuid}`. El antiguo `slug` quedó como texto libre y no se usa más en URLs (UNIQUE eliminado por la migración 0006).
- **Dueño:** `playlists.parish_id` (parroquia creadora) + `playlists.created_by` (usuario).
- **Visibilidad:** `playlists.visibility ∈ {public, unlisted, private}`.
- **Compartir por URL:** quien tenga la URL `/playlists/{uuid}` puede ver la playlist **independientemente de `visibility`**. La visibilidad solo decide si la playlist aparece o no en listados públicos / búsquedas. Esto vale incluso para playlists `private` si el dueño compartió el link explícitamente.
- **Playlist personal (`parish_id IS NULL`):** rol `member` puede crear playlists sin parroquia. El dueño es `created_by`. Aparecen en sus propios listados y se comparten por URL como cualquier otra. El admin puede reasignar el `parish_id` (convertir personal → de parroquia, o viceversa).
- **Compartir entre parroquias:** tabla `playlist_parish_subscriptions(playlist_id, parish_id)`. Otra parroquia puede "suscribirse" a una playlist pública para que aparezca en su listado.
- **Arquidiocesanas:** flag `playlists.is_archdiocesan`. Si está en `true`, la playlist se ve por defecto en el listado de todas las parroquias (sin necesidad de suscripción explícita). Solo el **editor** puede marcar `is_archdiocesan = true` (es siempre coordinator de la parroquia virtual `arquidiocesis`).

### Listados disponibles

- `/playlists` — **"Tus playlists"**: si hay sesión, agrupa las playlists de cada parroquia en la que el usuario es miembro (propias + suscriptas + arquidiocesanas). Sin sesión invita a iniciar sesión. Logueado sin parroquias asociadas, invita a vincularse a una en `/parroquias` (CU-14).
- `/parroquias/{slug}/playlists` — listado completo de playlists asociadas a una parroquia, agrupado en *De esta parroquia / Compartidas / De la Arquidiócesis*. Si el usuario es admin o coordinator de esa parroquia, ve botón **"+ Nueva playlist"**.
- `/parroquias/{slug}` — preview de las 4 últimas playlists con link "Ver todas" cuando hay más.

### Flujo principal — Crear

1. Coordinador (o admin) entra a `/parroquias/{slug}/playlists/nueva`.
2. Completa nombre (obligatorio), descripción, visibilidad, **vigencia** (ver más abajo), **imagen opcional** (CU-17.4) y opcionalmente `is_archdiocesan` (campo visible solo para el editor, sobre playlists de `arquidiocesis`).
3. Al guardar, el sistema redirige a `/playlists/{nuevo-id}/editar`.
4. En la pantalla de edición, abajo aparece el editor de canciones (CU-17.1.a).

### Vigencia temporal (CU-17.3)

La playlist puede configurarse para mostrarse solo en ciertos días/horarios. Persistencia en `entity_schedules` (`entity_type='playlist'`, evaluación en hora **America/Argentina/Buenos_Aires**). Default: sin reglas → siempre visible.

Por cada **regla** se elige:

- **Calendario**: `Siempre` / `Días de la semana` (uno o varios; orden D-L-M-M-J-V-S, índice 0..6) / `Rango de fechas` (desde + hasta opcional; sin hasta = nunca termina).
- **Horario**: `Todo el día` / `Franja horaria` (inicio + fin; si `fin < inicio`, la franja **cruza la medianoche**).

Pueden agregarse varias reglas; se evalúan con **OR** (basta con que una se cumpla para que la playlist sea visible). Por regla, calendario y horario se evalúan con **AND**.

Las pantallas de **configuración** (admin / edición) muestran todas las playlists sin filtrar por vigencia. El filtro aplica solo a listados públicos.

### Flujo principal — Editar metadatos / eliminar

- En `/playlists/{id}` aparece botón **"Editar playlist"** si el usuario es admin o coordinator de la parroquia dueña.
- En `/playlists/{id}/editar`:
  - Sección **"Datos"**: nombre, descripción, fecha, visibilidad, `is_archdiocesan`. Botón **Guardar** persiste y vuelve a `/playlists/{id}`.
  - Botón **"Eliminar playlist"**: pide confirmación con `window.confirm`. Borrado físico (`playlist_songs` se borra por `ON DELETE CASCADE`). Tras eliminar, redirige al listado de la parroquia.

### Flujos alternativos

- 1a. Sin permisos sobre la parroquia: el sistema rechaza la operación (RLS) y/o la pantalla redirige.
- Eliminación de playlist con suscripciones: las filas en `playlist_parish_subscriptions` se borran por CASCADE.

### CU-17.1: Edición de canciones dentro de la playlist

En `/playlists/{id}/editar`, sección **"Canciones"**:

Las operaciones (agregar, quitar, reordenar) modifican únicamente el estado local del editor y marcan el formulario como "sucio". Nada se persiste hasta que el usuario presiona **[Grabar cambios]**. Si se navega o recarga sin grabar, los cambios se pierden.

a. **Buscador "Agregar canción"** — input que consulta `/api/songs/buscar` (mismo motor que CU-01, accent-insensitive vía RPC `search_songs`). Al elegir un resultado, se agrega al final del listado local con `position = max(position)+1` y se marca dirty.

b. **Listado actual** — cada fila muestra `[handle ☰] [número] [título] [tacho]`. Click en el tacho pide confirmación y quita la fila del estado local (marca dirty). El handle ☰ es el área arrastrable.

c. **Drag & drop para reordenar** — implementado con `@dnd-kit/core` + `@dnd-kit/sortable`. Se arrastra desde el handle ☰; al soltar, se actualiza el orden local y se marca dirty.

d. **Botón [Grabar cambios]** — visible solo cuando hay cambios pendientes. Llama a `PUT /api/playlists/{id}/songs` enviando el array completo `[{song_id, position}]`. El endpoint borra todas las filas de `playlist_songs` para esa playlist e inserta las nuevas con sus posiciones (RLS valida permisos).

e. *(Pendiente)* **Edición en lote** con marcado para eliminación múltiple.

### CU-17.2: Quitar canción de una playlist

- **Disparador:** botón **Quitar** en cada fila del editor de canciones (`/playlists/{id}/editar`).
- **Flujo:** confirmación + `delete from playlist_songs where playlist_id=… and song_id=… and position=…`.
- **Postcondiciones:** la canción ya no figura en la playlist; sigue existiendo en `songs`.

### CU-17.4: Imagen de la playlist (opcional)

Una playlist puede tener una imagen asociada que aparece como franja izquierda (75px) en la card en home y listados. Persistencia: `playlists.image_path` (mig. 0023) apuntando a un objeto del bucket público `images`.

- **Disparador:** sección "Imagen" del formulario en `/playlists/nueva` y `/playlists/{id}/editar`. Componente `ImageUploadField`.
- **Validaciones cliente:** JPG/PNG/WEBP, hasta 2 MB. Al cambiar la imagen, la anterior se borra del bucket antes de subir la nueva.
- **Permisos:** RLS sobre `storage.objects` exige autenticado + dueño + (`is_editor()` o `is_any_coordinator()`) para INSERT; UPDATE/DELETE permiten editor o dueño del objeto.
- **Render:** `CardWithImage` (componente reusable). Si no hay imagen, la card no muestra franja.

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
- **Actores primarios:** Editor / Admin.
- **Precondiciones:** Sesión con rol editor o admin.
- **Disparador:** Acceso a `/admin/parroquias` (o botón "+ Agregar" desde `/parroquias`).
- **Flujo principal:**
  1. El editor o admin crea/edita/baja parroquias (nombre, dirección, slug, contacto).
  2. Al crear una nueva, el sistema ofrece **autocompletar desde OpenStreetMap** (CU-19.1).
  3. El sistema valida unicidad del slug (`parishes.slug`).
  4. Persiste los cambios. La parroquia queda **activa de inmediato** — no existe estado `pending` ni flujo de aprobación (decisión 2026-05-15).
- **Flujos alternativos:**
  - 3a. Slug duplicado: el sistema sugiere uno alternativo basado en `slugify(name)` con sufijo numérico.
  - **Sin permisos:** coordinator y member NO pueden crear, editar ni borrar parroquias; la UI esconde los botones y la RLS rechaza.
- **Postcondiciones:** Parroquia persistida y visible.

### CU-19.1: Autocompletar parroquia desde OpenStreetMap (Nominatim)

Al crear una parroquia nueva, el formulario ofrece dos modos de localización usando el servicio gratuito **Nominatim** de OpenStreetMap (sin API key, ver `lib/nominatim.ts`). Las llamadas se proxy-ean por el endpoint server `/api/parroquias/buscar` para respetar el `User-Agent` exigido por la política de uso de Nominatim y evitar CORS.

a. **Por GPS del navegador:** el sistema solicita `navigator.geolocation.getCurrentPosition`. Con las coordenadas, consulta Nominatim acotado a un viewbox de ~2 km alrededor del punto y muestra una lista de candidatos con nombre y dirección. Al elegir uno se prellenan `name`, `address`, `city`.

b. **Por búsqueda de texto:** el editor/admin escribe un nombre/dirección (mínimo 3 caracteres) y se invoca `nominatim.openstreetmap.org/search`. Al elegir un resultado se prellenan los mismos campos.

- **Flujos alternativos:**
  - a.1. El navegador deniega geolocalización: se muestra mensaje y se ofrece el modo (b).
  - a.2. Sin candidatos cercanos: se muestra mensaje "No encontramos parroquias cerca" y se ofrece (b).
  - El editor/admin siempre puede editar manualmente cualquier campo prellenado.
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
- **Actores primarios:**
  - **Coordinator:** crea anuncios dirigidos a su(s) parroquia(s).
  - **Editor / Admin:** además crean anuncios globales (sin destinatarios específicos) y pueden dirigir a cualquier parroquia.
- **Precondiciones:** Sesión con rol coordinator, editor o admin.
- **Disparador:** Acceso a `/admin/anuncios`.
- **Alcance:** "anuncio" y "novedad" son el mismo concepto. Un anuncio es una pieza de contenido con **vigencia configurable** (ver `entity_schedules`, CU-17.3) que aparece en la home (CU-07). Pueden ser **anuncios comunes** (`kind is null`) o **festividades litúrgicas** (`kind` con valor) que reemplazan a la antigua tabla `liturgical_events` (eliminada en migración 0018).

### Modelo

- **Vigencia:** se evalúa con `entity_schedules` (`entity_type='announcement'`) en hora AR. Sin reglas → siempre vigente.
- **Tipo (`kind`):** NULL para anuncios comunes; valor (`solemnidad` / `fiesta` / `memoria` / `tiempo` / `indicaciones`) para festividades litúrgicas o indicaciones que la home muestra en el bloque "Festividad de hoy".
- **Atajo opcional (banner clickeable):** `target_kind ∈ ('song','playlist','parish','external','none','document')` + `target_id` o `target_url`. Si está definido, el banner enlaza al recurso correspondiente. Si `target_kind='none'`, el anuncio es solo informativo. Si `target_kind='document'`, enlaza a `/anuncios/{id}` donde se renderiza el documento rich asociado (`announcement_documents`).
- **Destacado (`featured`):** si `true`, el anuncio se muestra como **popup fullscreen** sobre la home en cada carga (con X para cerrar y CTA al atajo si lo tiene). Sigue apareciendo también en el grid normal. Si hay varios destacados aplicables, gana el de mayor `priority`.
- **Destinatarios:** tabla N–N `announcement_parishes(announcement_id, parish_id)`.
  - Sin filas → **anuncio global** (en la home lo ven todos, anónimos y autenticados).
  - Con filas → **anuncio dirigido a parroquias específicas**: en la home solo lo ven los autenticados asociados (vía `parish_members`) a alguna de esas parroquias. En la **página de la parroquia** (`/parroquias/{slug}`) lo ve cualquier visitante.
  - El filtro por audiencia se aplica client-side en los loaders. La RLS (mig. 0035) habilita lectura abierta para soportar la página de parroquia y `/anuncios/{id}`.
- **Deduplicación:** un mismo anuncio se muestra una sola vez al usuario, aunque esté asociado a múltiples parroquias destinatarias.
- **Documento asociado (target_kind='document'):** en el form, al elegir el atajo "Documento" aparece el botón **"Crear documento"** / **"Editar documento"**. Si el anuncio aún no fue persistido, al hacer click el form valida + guarda el anuncio y navega al editor `/admin/anuncios/{id}/documento`. El editor es **TipTap** (StarterKit + Underline + Link) y soporta pegado preservando formato desde Word/Docs/web. Al guardar, hace `upsert` en `announcement_documents`. La vista pública `/anuncios/{id}` sanea el HTML con **DOMPurify** antes de renderizar.

### Flujo principal — Crear

1. El usuario entra a `/admin/anuncios/nuevo`.
2. Completa: `title` (obligatorio), `body` (opcional), `kind` (opcional — festividad), `priority`, **imagen opcional** (`image_path` en bucket `images`, mismas reglas que CU-17.4), **vigencia** (ver CU-17.3 — mismo editor reusado).
3. Selecciona destinatarios:
   - **Todas las parroquias** (anuncio global, sin filas en `announcement_parishes`) — opción visible solo para **editor + admin**.
   - **Parroquias específicas** — selector multi-select. El **coordinator** solo ve sus propias parroquias y debe elegir al menos una; editor/admin pueden elegir cualquiera.
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

- `/admin/anuncios` — listado server-side, agrupado en **vigentes ahora** y **no vigentes ahora** (computado con `isVisibleNow` sobre los schedules). Cada fila muestra título, `kind` si aplica, prioridad, atajo y destinatarios. Botón "+ Nuevo anuncio". **No filtra por vigencia** — admin ve todos los anuncios para poder editarlos.

### Flujos alternativos

- 3a. **Selección "específicas" sin elegir ninguna parroquia** → error de validación.
- 3b. **Coordinator intenta crear anuncio global** → la opción "Todas las parroquias" no aparece en su UI; si llega vía API, RLS rechaza.
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
     - 👤 **Menú** (avatar del usuario o silueta si invitado) → tooltip "Menú".
  2. **Buscar:** abre un overlay/diálogo con un input de búsqueda global. A medida que el usuario tipea, el sistema busca en paralelo en **canciones**, **playlists** y **parroquias** y agrupa resultados por tipo. Al elegir uno, navega al detalle correspondiente (canción → CU-02, playlist → CU-05, parroquia → CU-06.2). Reusa el motor de CU-01.
  3. **Mis favoritos:** abre el diálogo popup de CU-22.
  4. **Menú:** abre el menú desplegable con encabezado de perfil read-only (avatar + nombre + email, o "Invitado" + botón "Iniciá sesión") y los items de navegación y configuración.
- NOTA: Asignación N:M canción↔categoría implementada (mig. 0021). ABM de `categories` no implementado: hoy se gestiona por SQL. Decisión: catálogo estable, no justifica pantalla.      
- **Flujos alternativos:**
  - **Buscar sin término:** el overlay muestra accesos rápidos (parroquias destacadas, últimas playlists, etc.).
- **Postcondiciones:** Ninguna persistente; las acciones derivadas siguen sus propios CU.

---

## CU-25: Gestión de categorías litúrgicas

- **RF:** RF22
- **Actores primarios:** Editor / Admin (las categorías se asignan dentro del editor de canción, y las canciones solo las gestionan editor/admin desde la mig. 0037).
- **Precondiciones:** Sesión activa con rol editor o admin.
- **Alcance:** una canción puede tener **una o varias** categorías litúrgicas (Entrada, Comunión, Ofertorio, Salida, Mariana, etc.). La relación canción↔categoría se modela como N:M en la tabla pivote `song_categories` (mig. 0021). El catálogo `categories` es un vocabulario controlado.

### Asignación de categorías a una canción (implementado)

- **Disparador:** desde el formulario de edición de canción (CU-16, CU-16.1), sección "Metadatos".
- **Flujo principal:**
  1. El sistema muestra todas las categorías del catálogo como **chips clicables** ordenadas por `sort_order, name`.
  2. El usuario toca un chip para seleccionarlo (queda con estilo "primary"); vuelve a tocarlo para deseleccionarlo.
  3. Al guardar la canción, el sistema sincroniza `song_categories` por diferencia: borra los vínculos quitados e inserta los nuevos. No se hace delete-all + insert.
  4. Al publicar la canción (CU-16, `approve_song`), el snapshot de categorías vigentes se copia a `song_version_categories` para preservar trazabilidad por versión.
- **Postcondiciones:** Filas en `song_categories` reflejan el conjunto seleccionado. Vista pública (CU-02) muestra los chips bajo el título; búsqueda (CU-01) matchea por nombre de categoría.

### ABM del catálogo `categories` (no implementado)

- **Estado:** la creación / edición / baja de categorías **no tiene pantalla** en la app.
- **Razón:** el catálogo es estable (~18 entradas que cubren las clases litúrgicas estándar). No justifica el costo de mantener una UI dedicada.
- **Cómo se gestiona hoy:** por SQL directo sobre `categories` (insert/update/delete). Las FKs en `song_categories` y `song_version_categories` son `ON DELETE CASCADE`: borrar una categoría desasocia automáticamente las canciones de ella, pero **no las elimina**.
- **Si en el futuro se necesita ABM:** ver pantalla bajo `/admin/categorias`. Hoy se descarta para evitar tooling de bajo uso.

---

## CU-26 - Pagina de creditos y privacidad

- Asi quedan los emails cuando se acceden a las paginas /creditos o /privacidad:
  
  Setting                 Origen        Uso
  --------------------------------------------------------------------
  legal_contact_emails    Setting       /privacidad
  credits_contact_emails  Setting       /creditos


- Contactos de roles: esto se ve en /parroquias
- siempre desde DB vía parish_members y get_users_by_global_role.

  Visitante	          Personas            Si vacío
  --------------------------------------------------------------------
  Admin	                —                   —
  Editor              Admins              (mensaje "no hay contactos")
  Coord de la parro   Editores + Admins   (mensaje)
  Member común        Coords de la parro  Editores (fallback DB)
  Invitado            Coords de la parro  Sección oculta
