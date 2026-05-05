# MODELO DE DATOS — Cancionero Arquidiocesano Digital

Tablas tentativas necesarias para soportar los casos de uso definidos en [`casos_de_uso.md`](casos_de_uso.md). Convención: PostgreSQL (Supabase), nombres en `snake_case` y singular para tablas de catálogo en plural por convención Supabase. Todas las tablas llevan `id uuid` (default `gen_random_uuid()`), `created_at timestamptz` y `updated_at timestamptz` salvo aclaración.

> **Nota:** valores tentativos. Ajustar tipos, constraints y RLS al validar con la Comisión.

## Flujo editorial: `draft → review → published`

Las **canciones** (`songs`) atraviesan el siguiente flujo. Los **archivos asociados** (`song_files`) no tienen estado propio: heredan visibilidad de la canción a la que pertenecen (ver migración 0017).

1. **`draft`** — un **Coordinador parroquial** (o Editor) crea/edita el recurso. No es visible al público.
2. **`review`** — el Coordinador envía a revisión. El recurso queda bloqueado para edición salvo por el Editor.
3. **`published`** — el **Editor de contenido** aprueba; el recurso pasa a ser público.
4. **`rejected`** — el Editor rechaza con `review_notes`; vuelve a `draft` editable por el Coordinador.
5. **`archived`** — baja lógica (no se elimina por integridad referencial con `playlists`).

Las transiciones se controlan por trigger + RLS en Supabase. Los campos `submitted_by`, `submitted_at`, `reviewed_by`, `reviewed_at`, `review_notes` registran la traza editorial.

---

## Resumen

| Tabla                  | Propósito                                                  | Fase | CU principales                |
| ---------------------- | ---------------------------------------------------------- | ---- | ----------------------------- |
| `parishes`             | Parroquias                                                 | 1    | CU-06.1, CU-06.2, CU-19       |
| `authors`              | Autores de canciones                                       | 1    | CU-02, CU-16                  |
| `categories`           | Categorías litúrgicas                                      | 1    | CU-01, CU-16                  |
| `songs`                | Canciones (letra, acordes, metadatos)                      | 1    | CU-01, CU-02, CU-16           |
| `song_versions`        | Historial de versiones de cada canción                     | 1    | CU-16                         |
| `song_files`           | Archivos asociados (partitura PDF, audio)                  | 1/2  | CU-09, CU-16                  |
| `playlists`            | Listas de canciones por parroquia                          | 1    | CU-05, CU-11, CU-17           |
| `playlist_songs`       | Relación playlist ↔ canción (ordenada)                     | 1    | CU-05, CU-17                  |
| `playlist_parish_subscriptions` | Suscripción de una parroquia a una playlist ajena | 1    | CU-17                         |
| `liturgical_events`    | Festividades del calendario litúrgico                      | 1    | CU-07                         |
| `users`                | Perfil de usuario (extiende `auth.users` de Supabase)      | 2    | CU-13, CU-14, CU-18           |
| `roles`                | Roles del sistema                                          | 2    | CU-20                         |
| `user_roles`           | Asignación de roles a usuarios                             | 2    | CU-18, CU-20                  |
| `permissions`          | Permisos atómicos                                          | 2    | CU-20                         |
| `role_permissions`     | Permisos asignados a cada rol                              | 2    | CU-20                         |
| `parish_members`       | Vínculo usuario ↔ parroquia (con rol contextual)           | 2    | CU-14, CU-17                  |
| `favorites`            | Likes del usuario sobre canciones / playlists / parroquias | 2    | CU-15, CU-22                  |
| `user_song_keys`       | Tono preferido del usuario por canción (transposición)     | 2    | CU-03                         |
| `announcements`        | Anuncios / novedades destacadas en la home                 | 2    | CU-07, CU-21                  |
| `announcement_parishes`| Destino multi-parroquia de un anuncio (N–N)                | 2    | CU-21                         |
| `settings`             | Configuraciones clave/valor                                | 1    | global                        |

---

## FASE 1

### `parishes`
Datos de cada parroquia. El `slug` se usa para URLs públicas (CU-06.2).

| Columna       | Tipo         | Notas                                                    |
| ------------- | ------------ | -------------------------------------------------------- |
| `id`          | uuid         | PK                                                       |
| `name`        | text         | NOT NULL                                                 |
| `slug`        | text         | NOT NULL, UNIQUE — usado en `/parroquia/{slug}`          |
| `address`     | text         | dirección completa                                       |
| `city`        | text         |                                                          |
| `phone`       | text         |                                                          |
| `email`       | text         |                                                          |
| `description` | text         | bio / presentación de la parroquia                       |
| `logo_url`    | text         | URL en Supabase Storage (bucket `parishes`)              |
| `is_active`   | boolean      | default true                                             |
| `created_at`  | timestamptz  | default now()                                            |
| `updated_at`  | timestamptz  | default now()                                            |

**Índices:** `slug` UNIQUE, `name` (búsqueda).

---

### `authors`
Catálogo de autores. Una canción puede tener un autor principal.

| Columna      | Tipo        | Notas                              |
| ------------ | ----------- | ---------------------------------- |
| `id`         | uuid        | PK                                 |
| `name`       | text        | NOT NULL, UNIQUE                   |
| `bio`        | text        |                                    |
| `created_at` | timestamptz | default now()                      |
| `updated_at` | timestamptz | default now()                      |

---

### `categories`
Categorías litúrgicas (Entrada, Comunión, Ofertorio, Salida, Mariana, etc.).

| Columna       | Tipo        | Notas                                  |
| ------------- | ----------- | -------------------------------------- |
| `id`          | uuid        | PK                                     |
| `name`        | text        | NOT NULL, UNIQUE                       |
| `slug`        | text        | NOT NULL, UNIQUE                       |
| `description` | text        |                                        |
| `sort_order`  | int         | para ordenar en filtros                |
| `created_at`  | timestamptz | default now()                          |

---

### `songs`
Núcleo del catálogo. Almacena letra y acordes en un único campo `body` con notación tipo ChordPro (acordes entre `[ ]` sobre la sílaba), lo que permite renderizar con o sin acordes (CU-02.1, CU-02.2) y transponer (CU-03).

El `body` también soporta directivas ChordPro de estribillo: las líneas que se ubiquen entre `{start_of_chorus}` y `{end_of_chorus}` (alias `{soc}` / `{eoc}`) se renderizan como bloque de estribillo (borde lateral + itálica). Las directivas se consumen en el parser y no aparecen en la salida.

| Columna             | Tipo        | Notas                                                                    |
| ------------------- | ----------- | ------------------------------------------------------------------------ |
| `id`                | uuid        | PK                                                                       |
| `number`            | int         | número de canción (búsqueda CU-01); UNIQUE NULLS NOT DISTINCT            |
| `title`             | text        | NOT NULL                                                                 |
| `slug`              | text        | NOT NULL, UNIQUE                                                         |
| `author_id`         | uuid        | FK → `authors.id`, ON DELETE SET NULL                                    |
| `category_id`       | uuid        | FK → `categories.id`, ON DELETE SET NULL                                 |
| `body`              | text        | NOT NULL — letra con acordes en notación ChordPro                        |
| `original_key`      | text        | tonalidad original (ej. "G", "Em")                                       |
| `tempo_bpm`         | int         |                                                                          |
| `tags`              | text[]      | etiquetas libres                                                         |
| `youtube_url`       | text        | link de referencia (CU-04)                                               |
| `status`            | text        | CHECK in ('draft','review','published','rejected','archived'); default 'draft' |
| `current_version`   | int         | NOT NULL default 1 — apunta a `song_versions.version`                    |
| `created_by`        | uuid        | FK → `users.id` — autor del alta (Coordinador o Editor)                  |
| `submitted_by`      | uuid        | FK → `users.id` — quien envió a revisión                                 |
| `submitted_at`      | timestamptz |                                                                          |
| `reviewed_by`       | uuid        | FK → `users.id` — Editor que aprobó/rechazó                              |
| `reviewed_at`       | timestamptz |                                                                          |
| `review_notes`      | text        | comentario del Editor (obligatorio si `rejected`)                        |
| `published_at`      | timestamptz |                                                                          |
| `created_at`        | timestamptz | default now()                                                            |
| `updated_at`        | timestamptz | default now()                                                            |

**Índices:**
- `title`, `body` con `pg_trgm` (búsqueda por título y fragmento de letra — CU-01).
- `tsvector` generado de `title || body` para full-text search.
- `number` UNIQUE.
- `category_id`, `author_id`, `status`.

---

### `song_versions`
Historial inmutable de versiones de una canción. Cada vez que el Editor publica una nueva revisión, se inserta una fila con el snapshot del contenido aprobado. Permite ver, comparar y restaurar versiones anteriores.

| Columna         | Tipo        | Notas                                                                |
| --------------- | ----------- | -------------------------------------------------------------------- |
| `id`            | uuid        | PK                                                                   |
| `song_id`       | uuid        | FK → `songs.id` ON DELETE CASCADE                                    |
| `version`       | int         | NOT NULL — número incremental (1, 2, 3…)                             |
| `title`         | text        | NOT NULL — snapshot                                                  |
| `body`          | text        | NOT NULL — snapshot de letra+acordes                                 |
| `original_key`  | text        |                                                                      |
| `tempo_bpm`     | int         |                                                                      |
| `tags`          | text[]      |                                                                      |
| `youtube_url`   | text        |                                                                      |
| `author_id`     | uuid        | FK → `authors.id`                                                    |
| `category_id`   | uuid        | FK → `categories.id`                                                 |
| `change_summary`| text        | descripción del cambio (ej. "corrección acorde compás 8")            |
| `submitted_by`  | uuid        | FK → `users.id`                                                      |
| `reviewed_by`   | uuid        | FK → `users.id`                                                      |
| `published_at`  | timestamptz | NOT NULL — fecha en que esta versión pasó a `published`              |
| `created_at`    | timestamptz | default now()                                                        |

**PK compuesta:** `(song_id, version)` UNIQUE.
**Índices:** `song_id`, `(song_id, version DESC)`.

> **Nota:** las ediciones en curso (`draft`/`review`) viven en `songs`. Solo al aprobar se materializa la nueva fila en `song_versions` y se incrementa `songs.current_version`.

---

### `song_files`
Archivos asociados a una canción (puede haber varias partituras y audios). Apunta a Supabase Storage.

| Columna       | Tipo        | Notas                                                       |
| ------------- | ----------- | ----------------------------------------------------------- |
| `id`          | uuid        | PK                                                          |
| `song_id`     | uuid        | FK → `songs.id` ON DELETE CASCADE                           |
| `kind`        | text        | CHECK in ('score_pdf','audio_mp3','audio_ogg','other')      |
| `bucket`      | text        | NOT NULL — `partituras` o `audios`                          |
| `path`        | text        | NOT NULL — ruta dentro del bucket                           |
| `label`       | text        | ej. "Partitura SATB", "Voz guía"                            |
| `is_primary`  | boolean     | default false                                               |
| `size_bytes`  | bigint      |                                                             |
| `uploaded_by` | uuid        | FK → `users.id` — Coordinador o Editor que subió el archivo |
| `created_at`  | timestamptz | default now()                                               |

**Índices:** `song_id`, `(song_id, kind)`.

> **Nota:** los archivos no tienen workflow editorial propio; su visibilidad deriva del `status` de la canción. Si la canción está en `published`, sus archivos son descargables públicamente (CU-09); en cualquier otro estado, solo el uploader y editor/admin pueden verlos. Migración 0017 quitó las columnas `status`, `submitted_by`, `submitted_at`, `reviewed_by`, `reviewed_at`, `review_notes` y `published_at`.

---

### `playlists`
Lista de canciones de una parroquia para una celebración o uso general. La URL canónica es `/playlists/{id}` (UUID).

| Columna           | Tipo        | Notas                                                     |
| ----------------- | ----------- | --------------------------------------------------------- |
| `id`              | uuid        | PK                                                        |
| `parish_id`       | uuid        | FK → `parishes.id` ON DELETE CASCADE — parroquia dueña    |
| `name`            | text        | NOT NULL                                                  |
| `description`     | text        |                                                           |
| `event_date`      | date        | fecha de la celebración (opcional)                        |
| `visibility`      | text        | CHECK in ('public','unlisted','private'); default 'public'|
| `is_archdiocesan` | boolean     | default false. Cuando true (solo si `parish_id` corresponde a la parroquia virtual `arquidiocesis`), la playlist se ve por defecto en todas las parroquias |
| `created_by`      | uuid        | FK → `users.id`                                           |
| `created_at`      | timestamptz | default now()                                             |
| `updated_at`      | timestamptz | default now()                                             |

**Índices:** `parish_id`, `event_date`, `is_archdiocesan` (parcial donde true), `name` (GIN unaccent+trgm para búsqueda).

---

### `playlist_songs`
Relación N:M ordenada entre `playlists` y `songs`.

| Columna        | Tipo        | Notas                                                          |
| -------------- | ----------- | -------------------------------------------------------------- |
| `playlist_id`  | uuid        | FK → `playlists.id` ON DELETE CASCADE                          |
| `song_id`      | uuid        | FK → `songs.id` ON DELETE RESTRICT                             |
| `position`     | int         | NOT NULL — orden dentro de la playlist                         |
| `note`         | text        | nota libre (ej. "comienza el cantor solo")                     |
| `key_override` | text        | tono elegido para esta playlist (CU-03 con persistencia local) |
| `created_at`   | timestamptz | default now()                                                  |

**PK compuesta:** `(playlist_id, song_id, position)`.
**Índices:** `(playlist_id, position)`.

---

### `playlist_parish_subscriptions`
Permite que una parroquia "adopte" una playlist creada por otra (ver CU-17, modelo estilo Spotify). Independiente del flag `is_archdiocesan` que aplica de forma global.

| Columna         | Tipo        | Notas                                            |
| --------------- | ----------- | ------------------------------------------------ |
| `playlist_id`   | uuid        | FK → `playlists.id` ON DELETE CASCADE            |
| `parish_id`     | uuid        | FK → `parishes.id` ON DELETE CASCADE             |
| `subscribed_by` | uuid        | FK → `users.id` ON DELETE SET NULL               |
| `subscribed_at` | timestamptz | default now()                                    |

**PK compuesta:** `(playlist_id, parish_id)`.
**Índices:** `parish_id`.

---

### `liturgical_events`
Festividades fijas/movibles del calendario litúrgico para CU-07. **Carga manual** año a año por el Administrador (a futuro, se evaluará un servicio externo que entregue el calendario litúrgico automáticamente).

| Columna        | Tipo        | Notas                                                                     |
| -------------- | ----------- | ------------------------------------------------------------------------- |
| `id`           | uuid        | PK                                                                        |
| `name`         | text        | NOT NULL                                                                  |
| `slug`         | text        | NOT NULL, UNIQUE                                                          |
| `event_date`   | date        | NOT NULL — fecha concreta (se cargan año por año)                         |
| `kind`         | text        | CHECK in ('solemnidad','fiesta','memoria','tiempo','otro')                |
| `playlist_id`  | uuid        | FK → `playlists.id` opcional, sugerida para esa festividad                |
| `description`  | text        |                                                                           |
| `created_by`   | uuid        | FK → `users.id` — admin que cargó el evento                               |

**Índices:** `event_date`, `slug` UNIQUE.

---

### `settings`
Pares clave/valor globales (config feature flags, textos institucionales).

| Columna     | Tipo  | Notas        |
| ----------- | ----- | ------------ |
| `key`       | text  | PK           |
| `value`     | jsonb | NOT NULL     |
| `updated_at`| timestamptz | default now() |

---

## FASE 2

### `users`
Perfil aplicativo. Extiende `auth.users` de Supabase. Se crea por trigger al primer login (CU-13).

| Columna       | Tipo        | Notas                                          |
| ------------- | ----------- | ---------------------------------------------- |
| `id`          | uuid        | PK = `auth.users.id`                           |
| `email`       | text        | NOT NULL, UNIQUE                               |
| `display_name`| text        |                                                |
| `avatar_url`  | text        |                                                |
| `parish_id`   | uuid        | FK → `parishes.id` (parroquia "principal" — la que se selecciona con ⭐ en CU-14) |
| `preferences` | jsonb       | preferencias de UI (ej. `{ "suggestChords": true }`); default `{}` (migración 0005) |
| `is_active`   | boolean     | default true                                   |
| `created_at`  | timestamptz | default now()                                  |
| `updated_at`  | timestamptz | default now()                                  |

---

### `roles`
Catálogo de roles (`admin`, `editor`, `coordinator`, `member`).

| Columna       | Tipo  | Notas                |
| ------------- | ----- | -------------------- |
| `id`          | uuid  | PK                   |
| `name`        | text  | NOT NULL, UNIQUE     |
| `description` | text  |                      |

---

### `permissions`
Permisos atómicos (`song.create`, `song.delete`, `playlist.create`, `parish.manage`, etc.).

| Columna       | Tipo  | Notas                |
| ------------- | ----- | -------------------- |
| `id`          | uuid  | PK                   |
| `code`        | text  | NOT NULL, UNIQUE     |
| `description` | text  |                      |

---

### `role_permissions`
Permisos por rol (CU-20).

| Columna         | Tipo  | Notas                                |
| --------------- | ----- | ------------------------------------ |
| `role_id`       | uuid  | FK → `roles.id` ON DELETE CASCADE    |
| `permission_id` | uuid  | FK → `permissions.id` ON DELETE CASCADE |

**PK compuesta:** `(role_id, permission_id)`.

---

### `user_roles`
Asignación global de roles a usuarios.

| Columna     | Tipo        | Notas                                |
| ----------- | ----------- | ------------------------------------ |
| `user_id`   | uuid        | FK → `users.id` ON DELETE CASCADE    |
| `role_id`   | uuid        | FK → `roles.id` ON DELETE CASCADE    |
| `granted_at`| timestamptz | default now()                        |

**PK compuesta:** `(user_id, role_id)`.

---

### `parish_members`
Vínculo usuario ↔ parroquia con rol contextual (un mismo usuario puede ser coordinador en una parroquia y miembro en otra). Soporta CU-14 y CU-17.

| Columna     | Tipo        | Notas                                                          |
| ----------- | ----------- | -------------------------------------------------------------- |
| `user_id`   | uuid        | FK → `users.id` ON DELETE CASCADE                              |
| `parish_id` | uuid        | FK → `parishes.id` ON DELETE CASCADE                           |
| `role`      | text        | CHECK in ('coordinator','member'); default 'member'            |
| `joined_at` | timestamptz | default now()                                                  |

**PK compuesta:** `(user_id, parish_id)`.

---

### `favorites`
Likes polimórficos del usuario sobre canción / playlist / parroquia (CU-15, CU-22).

| Columna       | Tipo        | Notas                                                       |
| ------------- | ----------- | ----------------------------------------------------------- |
| `user_id`     | uuid        | FK → `users.id` ON DELETE CASCADE                           |
| `target_kind` | text        | CHECK in ('song','playlist','parish')                       |
| `target_id`   | uuid        | NOT NULL — id del recurso favoriteado                       |
| `created_at`  | timestamptz | default now()                                               |

**PK compuesta:** `(user_id, target_kind, target_id)`.
**Índices:** `(target_kind, target_id)` para conteo de likes.

> **Nota:** se usa target polimórfico en lugar de tres tablas separadas para simplificar la lista unificada de "Mis favoritos" (CU-22). La integridad referencial al target se valida por trigger.

---

### `user_song_keys`
Tono preferido por el usuario para una canción dada (CU-03). Cuando un usuario autenticado transpone una canción, se persiste acá y se restaura en cualquier dispositivo. Para anónimos, la persistencia ocurre solo en `localStorage` del navegador.

| Columna       | Tipo        | Notas                                                                       |
| ------------- | ----------- | --------------------------------------------------------------------------- |
| `user_id`     | uuid        | FK → `users.id` ON DELETE CASCADE                                           |
| `song_id`     | uuid        | FK → `songs.id` ON DELETE CASCADE                                           |
| `key`         | text        | tonalidad elegida (ej. "G", "Em", "F#")                                     |
| `semitones`   | int         | offset en semitonos respecto del `original_key` (positivo o negativo)       |
| `updated_at`  | timestamptz | default now()                                                               |

**PK compuesta:** `(user_id, song_id)`.
**Índices:** `user_id`, `song_id`.

> **Nota:** se guardan tanto `key` (string explícito) como `semitones` (offset). El offset es la fuente de verdad para reaplicar la transposición sobre el `body` actual de la canción aunque la versión cambie; `key` es el resultado calculado al momento de guardar y se usa para mostrarlo de inmediato.

> **Precedencia al resolver el tono inicial** (CU-03):
> 1. `playlist_songs.key_override` (si la canción se abre desde una playlist).
> 2. `user_song_keys` (usuario autenticado) o `localStorage` (anónimo).
> 3. `songs.original_key`.
>
> Las transposiciones realizadas mientras se está en contexto de playlist son override en sesión y **no** se persisten en `user_song_keys` ni modifican `playlist_songs.key_override`.

---

### `announcements`
Anuncios / novedades destacadas en la home (CU-07, CU-21). Solo el Administrador los gestiona. Vencen automáticamente al pasar `ends_at` (no hay cierre manual ni dismissals). Pueden incluir un **atajo opcional** a un recurso (canción, playlist, parroquia o URL externa) para que el banner sea clickeable.

| Columna        | Tipo        | Notas                                                                   |
| -------------- | ----------- | ----------------------------------------------------------------------- |
| `id`           | uuid        | PK                                                                      |
| `title`        | text        | NOT NULL                                                                |
| `body`         | text        | NULL permitido                                                          |
| `target_kind`  | text        | CHECK in ('song','playlist','parish','external','none'); default 'none' |
| `target_id`    | uuid        | requerido si `target_kind in ('song','playlist','parish')`              |
| `target_url`   | text        | requerido si `target_kind='external'`                                   |
| `priority`     | int         | default 0                                                               |
| `starts_at`    | timestamptz | NOT NULL                                                                |
| `ends_at`      | timestamptz | NOT NULL — CHECK `ends_at > starts_at`                                  |
| `created_by`   | uuid        | FK → `users.id` ON DELETE SET NULL                                      |
| `created_at`   | timestamptz | default now()                                                           |
| `updated_at`   | timestamptz | default now()                                                           |

**Índices:** `(starts_at, ends_at)`.

> **Alcance de visibilidad:** un anuncio es **global** si no tiene filas en `announcement_parishes`; en ese caso lo ven todos (anónimos y autenticados). Si tiene filas, es de **parroquias específicas** y lo ven únicamente los usuarios autenticados asociados (vía `parish_members`) a alguna de esas parroquias. Los anónimos solo ven los globales.

> **Deduplicación:** la consulta de la home devuelve cada anuncio una sola vez aunque el usuario esté asociado a varias parroquias destinatarias del mismo anuncio.

---

### `announcement_parishes`
Destino multi-parroquia de un anuncio (relación N–N con `parishes`). Si un anuncio no tiene filas acá, se considera **global**.

| Columna           | Tipo  | Notas                                                       |
| ----------------- | ----- | ----------------------------------------------------------- |
| `announcement_id` | uuid  | FK → `announcements.id` ON DELETE CASCADE                   |
| `parish_id`       | uuid  | FK → `parishes.id` ON DELETE CASCADE                        |

**PK compuesta:** `(announcement_id, parish_id)`.
**Índices:** `parish_id` (para resolver "anuncios de esta parroquia").

---

## Buckets de Supabase Storage

| Bucket        | Contenido                       | Acceso                                                                                 |
| ------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| `partituras`  | PDFs de partituras              | lectura pública (solo `published`); escritura: Coordinador/Editor; revisión: Editor    |
| `audios`      | mp3/ogg de referencia           | lectura pública (solo `published`); escritura: Coordinador/Editor; revisión: Editor    |
| `parishes`    | logos / imágenes de parroquia   | lectura pública; escritura: admin                                                      |

> RLS de Storage verifica que el `song_files` que apunta al objeto pertenezca a una canción en `songs.status = 'published'` (vía join) antes de permitir lectura pública. Si la canción está en `draft`/`review`/`rejected`, los archivos solo son visibles para el uploader y Editor/Admin.

---

## Trazabilidad CU → Tabla

| CU      | Tablas involucradas                                                                |
| ------- | ---------------------------------------------------------------------------------- |
| CU-01   | `songs`, `playlists`, `parishes`, `categories`                                     |
| CU-02   | `songs`, `authors`, `categories`, `song_versions` (lectura)                        |
| CU-03   | `songs`, `user_song_keys` (autenticado), `playlist_songs.key_override` (contexto playlist), `localStorage` (anónimo) |
| CU-04   | `songs.youtube_url`                                                                |
| CU-05   | `playlists`, `playlist_songs`, `songs`, `parishes`                                 |
| CU-06.1 | `parishes`                                                                         |
| CU-06.2 | `parishes`, `playlists`                                                            |
| CU-07   | `liturgical_events`, `announcements`, `announcement_parishes`, `playlists`         |
| CU-08   | — (cliente)                                                                        |
| CU-09   | `song_files`, bucket `partituras`                                                  |
| CU-10   | `songs`                                                                            |
| CU-11   | `playlists`, `playlist_songs`, `songs`                                             |
| CU-12   | — (genera QR de la URL actual)                                                     |
| CU-13   | `auth.users` (Supabase), `users`                                                   |
| CU-14   | `users`, `parish_members`, `parishes`                                              |
| CU-15   | `favorites`                                                                        |
| CU-16   | `songs`, `song_versions`, `song_files`, `authors`, `categories` (flujo `draft → review → published`) |
| CU-17   | `playlists`, `playlist_songs`, `parish_members`                                    |
| CU-18   | `users`, `user_roles`                                                              |
| CU-19   | `parishes`                                                                         |
| CU-20   | `roles`, `permissions`, `role_permissions`, `user_roles`                           |
| CU-21   | `announcements`, `announcement_parishes`, `parish_members`                         |
| CU-22   | `favorites`                                                                        |
