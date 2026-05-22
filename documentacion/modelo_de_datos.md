# MODELO DE DATOS — Cancionero Arquidiocesano Digital

Tablas tentativas necesarias para soportar los casos de uso definidos en [`casos_de_uso.md`](casos_de_uso.md). Convención: PostgreSQL (Supabase), nombres en `snake_case` y singular para tablas de catálogo en plural por convención Supabase. Todas las tablas llevan `id uuid` (default `gen_random_uuid()`), `created_at timestamptz` y `updated_at timestamptz` salvo aclaración.

> **Nota:** valores tentativos. Ajustar tipos, constraints y RLS al validar con la Comisión.

## Flujo editorial: `draft → review → published`

Las **canciones** (`songs`) atraviesan el siguiente flujo. Los **archivos asociados** (`song_files`) no tienen estado propio: heredan visibilidad de la canción a la que pertenecen (ver migración 0017).

1. **`draft`** — el Editor/Admin crea/edita el recurso. No es visible al público.
2. **`review`** — paso opcional: el recurso se envía a revisión cuando un segundo editor valida. Desde `review` solo se puede aprobar o devolver a `draft`.
3. **`published`** — el **Editor de contenido** aprueba; el recurso pasa a ser público.
4. **`archived`** — baja lógica (no se elimina por integridad referencial con `playlists`).

Las transiciones se controlan por trigger + RLS en Supabase. Los campos `submitted_by`, `submitted_at`, `reviewed_by`, `reviewed_at` registran la traza editorial.

> **Cambio (mig. 0048):** se eliminó el estado `rejected` y la columna `review_notes`. Provenían del flujo cuando el Coordinador parroquial cargaba canciones; desde el cambio del 2026-05-15 solo el Editor/Admin gestiona el cantoral, por lo que el rechazo dejó de tener sentido.

---

## Resumen

| Tabla                  | Propósito                                                  | Fase | CU principales                |
| ---------------------- | ---------------------------------------------------------- | ---- | ----------------------------- |
| `parishes`             | Parroquias                                                 | 1    | CU-06.1, CU-06.2, CU-19       |
| `authors`              | Autores de canciones                                       | 1    | CU-02, CU-16                  |
| `categories`           | Categorías litúrgicas                                      | 1    | CU-01, CU-16                  |
| `songs`                | Canciones (letra, acordes, metadatos)                      | 1    | CU-01, CU-02, CU-16           |
| `song_versions`        | Historial de versiones de cada canción                     | 1    | CU-16                         |
| `song_events`          | Bitácora cronológica de eventos de cada canción            | 1    | CU-16                         |
| `song_files`           | Archivos asociados (partitura PDF, audio)                  | 1/2  | CU-09, CU-16                  |
| `playlists`            | Listas de canciones por parroquia                          | 1    | CU-05, CU-11, CU-17           |
| `playlist_songs`       | Relación playlist ↔ canción (ordenada)                     | 1    | CU-05, CU-17                  |
| `playlist_parish_subscriptions` | Suscripción de una parroquia a una playlist ajena | 1    | CU-17                         |
| `entity_schedules`     | Vigencia temporal genérica (calendario + horario, AR)      | 1    | CU-05, CU-07, CU-17, CU-21    |
| `users`                | Perfil de usuario (extiende `auth.users` de Supabase)      | 2    | CU-13, CU-14, CU-18           |
| `roles`                | Roles del sistema                                          | 2    | CU-20                         |
| `user_roles`           | Asignación de roles a usuarios                             | 2    | CU-18, CU-20                  |
| `permissions`          | Permisos atómicos                                          | 2    | CU-20                         |
| `role_permissions`     | Permisos asignados a cada rol                              | 2    | CU-20                         |
| `parish_members`       | Vínculo usuario ↔ parroquia (con rol contextual)           | 2    | CU-14, CU-17                  |
| `favorites`            | Likes del usuario sobre canciones / playlists / parroquias | 2    | CU-15, CU-22                  |
| `user_song_keys`       | Tono preferido del usuario por canción (transposición)     | 2    | CU-03                         |
| `announcements`        | Anuncios + festividades litúrgicas de la home              | 2    | CU-07, CU-21                  |
| `announcement_parishes`| Destino multi-parroquia de un anuncio (N–N)                | 2    | CU-21                         |
| `settings`             | Configuraciones clave/valor                                | 1    | global                        |

---

## FASE 1

### `parishes`
Datos de cada parroquia. El `slug` se usa para URLs públicas (CU-06.2).

| Columna       | Tipo          | Notas                                                                                      |
| ------------- | ------------- | ------------------------------------------------------------------------------------------ |
| `id`          | uuid          | PK                                                                                         |
| `name`        | text          | NOT NULL                                                                                   |
| `slug`        | text          | NOT NULL, UNIQUE — usado en `/parroquia/{slug}`                                            |
| `address`     | text          | dirección completa                                                                         |
| `city`        | text          |                                                                                            |
| `phone`       | text          |                                                                                            |
| `email`       | text          |                                                                                            |
| `description` | text          | bio / presentación de la parroquia                                                         |
| `logo_url`    | text          | URL en Supabase Storage (bucket `parishes`)                                                |
| `latitude`    | numeric(9,6)  | coordenada para ordenar por cercanía (CU-19) — mig. 0010                                   |
| `longitude`   | numeric(9,6)  | coordenada para ordenar por cercanía (CU-19) — mig. 0010                                   |
| `status`      | text          | NOT NULL default 'active', CHECK in ('active','inactive') — reemplazó `is_active` (mig. 0011 + 0038) |
| `decanato`    | text          | NOT NULL — decanato al que pertenece la parroquia (cambio manual fuera de migración)       |
| `parent_id`   | uuid          | FK self → `parishes.id`, nullable (sin ON DELETE). Si presente, esta parroquia es una capilla/sede dependiente de la parroquia padre. La UI solo consume nivel 1 de jerarquía (cambio manual fuera de migración) |
| `created_at`  | timestamptz   | default now()                                                                              |
| `updated_at`  | timestamptz   | default now()                                                                              |

**Índices:**
- `slug` UNIQUE.
- `parishes_name_idx` — GIN trigram sobre `name`.
- `parishes_name_unaccent_trgm_idx` — GIN trigram sobre `f_unaccent(lower(name))`.
- `parishes_city_unaccent_trgm_idx` — GIN trigram sobre `f_unaccent(lower(coalesce(city,'')))`.

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
Categorías litúrgicas (Entrada, Comunión, Ofertorio, Salida, Mariana, etc.). Vocabulario controlado, multi-asignable a una canción vía `song_categories`.

| Columna       | Tipo        | Notas                                  |
| ------------- | ----------- | -------------------------------------- |
| `id`          | uuid        | PK                                     |
| `name`        | text        | NOT NULL, UNIQUE                       |
| `slug`        | text        | NOT NULL, UNIQUE                       |
| `description` | text        |                                        |
| `sort_order`  | int         | para ordenar en filtros                |
| `created_at`  | timestamptz | default now()                          |

---

### `song_categories`
Tabla pivote N:M: una canción puede tener múltiples categorías litúrgicas y una categoría agrupa muchas canciones (mig. 0021).

| Columna       | Tipo | Notas                                                     |
| ------------- | ---- | --------------------------------------------------------- |
| `song_id`     | uuid | FK → `songs.id` ON DELETE CASCADE                         |
| `category_id` | uuid | FK → `categories.id` ON DELETE CASCADE                    |

**PK compuesta:** `(song_id, category_id)`.
**Índices:** `category_id` (para filtros por categoría).
**RLS:** lectura abierta; escritura solo `is_editor()` o `is_admin()`.

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
| `author_id`         | uuid        | FK → `authors.id`, ON DELETE SET NULL — autor principal (opcional)       |
| `author2_id`        | uuid        | FK → `authors.id`, ON DELETE SET NULL — autor secundario (opcional)      |
| `body`              | text        | NOT NULL — letra con acordes en notación ChordPro                        |
| `original_key`      | text        | tonalidad original (ej. "G", "Em")                                       |
| `tempo_bpm`         | int         |                                                                          |
| `youtube_url`       | text        | link de referencia (CU-04)                                               |
| `status`            | text        | CHECK in ('draft','review','published','archived'); default 'draft' (mig. 0048 eliminó 'rejected') |
| `current_version`   | int         | NOT NULL default 1 — apunta a `song_versions.version`                    |
| `created_by`        | uuid        | FK → `users.id` — autor del alta (Coordinador o Editor)                  |
| `submitted_by`      | uuid        | FK → `users.id` — quien envió a revisión                                 |
| `submitted_at`      | timestamptz |                                                                          |
| `reviewed_by`       | uuid        | FK → `users.id` — Editor que aprobó                                      |
| `reviewed_at`       | timestamptz |                                                                          |
| `published_at`      | timestamptz |                                                                          |
| `created_at`        | timestamptz | default now()                                                            |
| `updated_at`        | timestamptz | default now()                                                            |

**Índices:**
- `title`, `body` con `pg_trgm` (búsqueda por título y fragmento de letra — CU-01).
- `tsvector` generado de `title || body` para full-text search.
- `number` UNIQUE.
- `author_id`, `author2_id`, `status`.

> Las categorías litúrgicas se modelan vía `song_categories` (N:M). Una canción puede pertenecer a varias (Entrada y Salida, Comunión y Mariana, etc.).

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
| `youtube_url`   | text        |                                                                      |
| `author_id`     | uuid        | FK → `authors.id`                                                    |
| `change_summary`| text        | descripción del cambio (ej. "corrección acorde compás 8")            |
| `submitted_by`  | uuid        | FK → `users.id`                                                      |
| `reviewed_by`   | uuid        | FK → `users.id`                                                      |
| `published_at`  | timestamptz | NOT NULL — fecha en que esta versión pasó a `published`              |
| `created_at`    | timestamptz | default now()                                                        |

**PK compuesta:** `(song_id, version)` UNIQUE.
**Índices:** `song_id`, `(song_id, version DESC)`.

> **Nota:** las ediciones en curso (`draft`/`review`) viven en `songs`. Se materializa una nueva fila en `song_versions` (incrementando `songs.current_version`) en dos casos: al aprobar desde `review` (`approve_song`) y al guardar una edición directa sobre una canción ya `published` (`save_published_song_version`, mig. 0044). Las categorías del snapshot se guardan en `song_version_categories` (mig. 0021).

> **RPCs de historial (mig. 0044):**
> - `approve_song(p_song_id uuid, p_change_summary text default null)` — acepta un resumen opcional del cambio. La firma anterior `approve_song(uuid)` fue eliminada.
> - `save_published_song_version(p_song_id uuid, p_change_summary text default null)` — `security definer`. Inserta un snapshot e incrementa `current_version` al editar directamente una canción `published`.
> - `restore_song_version(p_song_id uuid, p_version int)` — `security definer`. Copia el contenido de una versión anterior de vuelta a `songs` (incluidas las categorías). **No** cambia `songs.status`.
> - `get_song_versions(p_song_id uuid)` — `security definer`. Devuelve el historial con el nombre/email del Editor resuelto (necesario por la RLS restrictiva de `users`).

---

### `song_version_categories`
Snapshot de categorías por versión publicada (N:M, mig. 0021). Se completa al ejecutar `approve_song`, copiando las filas vigentes de `song_categories`.

| Columna       | Tipo | Notas                                                                  |
| ------------- | ---- | ---------------------------------------------------------------------- |
| `song_id`     | uuid | parte de FK compuesta a `song_versions(song_id, version)` ON DELETE CASCADE |
| `version`     | int  | parte de FK compuesta                                                  |
| `category_id` | uuid | FK → `categories.id` ON DELETE CASCADE                                 |

**PK compuesta:** `(song_id, version, category_id)`.
**Índices:** `category_id`.
**RLS:** lectura abierta; escritura solo `is_editor()` o `is_admin()`.

---

### `song_events`
Bitácora cronológica e inmutable de toda la vida editorial de una canción (mig. 0045). A diferencia de `song_versions` —que solo guarda snapshots de contenido publicado— `song_events` registra **todas** las transiciones de estado (archivar, despublicar, rechazar, enviar a revisión, etc.), de modo que la fecha "Modificada" de una canción siempre se pueda explicar desde la UI del historial.

| Columna      | Tipo        | Notas                                                                   |
| ------------ | ----------- | ----------------------------------------------------------------------- |
| `id`         | uuid        | PK                                                                      |
| `song_id`    | uuid        | FK → `songs.id` ON DELETE CASCADE                                       |
| `event`      | text        | CHECK in ('created','submitted','withdrawn','published','edited','unpublished','archived','unarchived','restored') |
| `version`    | int         | nullable — nº de versión cuando el evento la genera (`published`, `edited`, `restored`) |
| `summary`    | text        | nullable — resumen autogenerado del cambio o notas de rechazo           |
| `actor_id`   | uuid        | FK → `users.id` ON DELETE SET NULL — quién ejecutó la acción            |
| `created_at` | timestamptz | NOT NULL default now()                                                  |

**Índices:** `(song_id, created_at DESC)`.
**RLS:** lectura abierta; INSERT solo `is_editor()` o `is_admin()`. Sin policy de update/delete (bitácora inmutable).

> **Cómo se completa:** cada RPC de transición de estado (`submit_song_for_review`, `withdraw_song_from_review`, `approve_song`, `save_published_song_version`, `restore_song_version`, `reject_song`, `unpublish_song`, `archive_song`, `unarchive_song`, `create_blank_song`) llama al helper `log_song_event(...)`. El `summary` de los eventos `published`/`edited` se autogenera con `build_change_summary(uuid)`, que compara el contenido vigente contra la última versión publicada.

> **RPCs (mig. 0045 / 0046):**
> - `log_song_event(p_song_id uuid, p_event text, p_version int, p_summary text)` — `security definer`. Inserta un evento con `actor_id = auth.uid()`.
> - `build_change_summary(p_song_id uuid)` — `security definer`. Devuelve un texto tipo "Cambió letra, tono, categorías" o "Publicación inicial".
> - `log_song_edit(p_song_id uuid)` — `security definer` (mig. 0046). Registra un evento `edited` SIN crear versión, para ediciones directas de canciones no publicadas (`draft`/`archived`).
> - `get_song_events(p_song_id uuid)` — `security definer`. Devuelve la bitácora con el nombre/email del actor resuelto.

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
| `visibility`      | text        | CHECK in ('public','unlisted','private'); default 'public'|
| `is_archdiocesan` | boolean     | default false. Cuando true (solo si `parish_id` corresponde a la parroquia virtual `arquidiocesis`), la playlist se ve por defecto en todas las parroquias |
| `image_path`      | text        | NULL permitido. Path dentro del bucket `images` para la imagen de la card (mig. 0023) |
| `created_by`      | uuid        | FK → `users.id`                                           |
| `created_at`      | timestamptz | default now()                                             |
| `updated_at`      | timestamptz | default now()                                             |

**Índices:** `parish_id`, `is_archdiocesan` (parcial donde true), `name` (GIN unaccent+trgm para búsqueda).

**Vigencia temporal:** la fecha/franja en que la playlist se muestra en listados públicos se modela con filas en `entity_schedules` (entity_type='playlist'). Sin filas → siempre visible (default). Las pantallas de admin/configuración omiten este filtro.

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

### `entity_schedules`
Vigencia temporal genérica para playlists y anuncios (CU-05, CU-07, CU-17, CU-21). Cada fila representa una **regla**; una entidad puede tener varias y se evalúan con OR (basta con que una se cumpla). Sin filas para una entidad → visible siempre. Todo se evalúa en zona horaria **America/Argentina/Buenos_Aires**.

| Columna       | Tipo         | Notas                                                                                              |
| ------------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `id`          | uuid         | PK                                                                                                 |
| `entity_type` | text         | CHECK in ('playlist','announcement') — polimórfico sin FK                                          |
| `entity_id`   | uuid         | id de la playlist o anuncio                                                                        |
| `date_mode`   | text         | CHECK in ('always','weekdays','date_range'); default 'always'                                      |
| `weekdays`    | smallint[]   | si `date_mode='weekdays'`: 0=domingo … 6=sábado (compatible con `extract(dow)`)                    |
| `start_date`  | date         | si `date_mode='date_range'`                                                                        |
| `end_date`    | date         | si `date_mode='date_range'`. Nullable = nunca termina                                              |
| `time_mode`   | text         | CHECK in ('all_day','range'); default 'all_day'                                                    |
| `start_time`  | time         | si `time_mode='range'`                                                                             |
| `end_time`    | time         | si `time_mode='range'`. Si `end_time < start_time`, la franja **cruza la medianoche**              |
| `created_by`  | uuid         | FK → `users.id` ON DELETE SET NULL                                                                 |
| `created_at`  | timestamptz  | default now()                                                                                      |
| `updated_at`  | timestamptz  | default now()                                                                                      |

**Índices:** `(entity_type, entity_id)`.

**RLS:** SELECT público. INSERT/UPDATE/DELETE: `editor`/`admin` siempre; `coordinator` solo si el target es una playlist suya o un anuncio donde es coordinator (helper `is_coordinator_of_schedule_target`).

> **Nota:** la integridad referencial al target es **lógica**, no por FK. Si se borra la playlist o el anuncio, sus schedules quedan huérfanos. La limpieza se hace por código en el handler de delete.

---

### `settings`
Pares clave/valor globales (config feature flags, textos institucionales).

| Columna     | Tipo  | Notas        |
| ----------- | ----- | ------------ |
| `key`       | text  | PK           |
| `value`     | jsonb | NOT NULL     |
| `updated_at`| timestamptz | default now() |

**Keys conocidas:**
- `admin_contact_emails` (jsonb array de strings) — emails del administrador general que se muestran en la vista pública de parroquia cuando esa parroquia no tiene Coordinador asignado, para que un visitante pueda solicitar el alta. Editable desde `/admin/parroquias` (sección "Configuración general"). Seed inicial `[]` en migración 0028.

**RLS:** SELECT público (`using (true)`). INSERT/UPDATE/DELETE solo `is_admin()`.

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

**RPC `get_parish_coordinators(p_parish_id uuid)`** (mig. 0026 + 0027) — `security definer`, devuelve `(user_id, display_name, email, avatar_url)` de los coordinators de una parroquia. Necesaria porque `users` tiene RLS restrictiva y la vista pública de parroquia debe mostrar la sección "Contacto" a visitantes anónimos. GRANT EXECUTE a `anon` y `authenticated`.

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
Anuncios + festividades litúrgicas que aparecen en la home (CU-07, CU-21). Pueden incluir un **atajo opcional** a un recurso (canción, playlist, parroquia o URL externa) para que el banner sea clickeable. La vigencia temporal vive en `entity_schedules` (entity_type='announcement'); sin filas → siempre vigente.

| Columna        | Tipo        | Notas                                                                                         |
| -------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `id`           | uuid        | PK                                                                                            |
| `title`        | text        | NOT NULL                                                                                      |
| `body`         | text        | NULL permitido                                                                                |
| `kind`         | text        | NULL = anuncio común. Si tiene valor in ('solemnidad','fiesta','memoria','tiempo','indicaciones') → festividad litúrgica o indicación |
| `target_kind`  | text        | CHECK in ('song','playlist','parish','external','none','document'); default 'none'            |
| `target_id`    | uuid        | requerido si `target_kind in ('song','playlist','parish')`                                    |
| `target_url`   | text        | requerido si `target_kind='external'`                                                         |
| `priority`     | int         | default 0                                                                                     |
| `featured`     | boolean     | default false. Si true, el anuncio se muestra como **popup fullscreen** en la home en cada carga (mig. 0033) |
| `image_path`   | text        | NULL permitido. Path dentro del bucket `images` para la imagen del anuncio (mig. 0023)        |
| `created_by`   | uuid        | FK → `users.id` ON DELETE SET NULL                                                            |
| `created_at`   | timestamptz | default now()                                                                                 |
| `updated_at`   | timestamptz | default now()                                                                                 |

> **Visibilidad (RLS, mig. 0035):** lectura totalmente abierta — cualquier usuario (incluso anónimo) puede leer cualquier anuncio. La vigencia se evalúa client-side con `entity_schedules`. El filtrado por audiencia ("solo globales para anónimo en la home" / "globales + las parroquias del miembro") se hace **en código** en los loaders de la home y `/novedades`, no en RLS. La página `/parroquias/[slug]` muestra todos los anuncios scoped a esa parroquia sin importar quién la visita.

> **Escritura (RLS, mig. 0041):** las policies de coordinator están **separadas por operación** porque `is_coordinator_of_announcement(id)` necesita filas en `announcement_parishes` que todavía no existen al momento del INSERT.
> - `announcements_coordinator_insert`: cualquier `is_any_coordinator()` puede crear un anuncio. El scope efectivo se controla en la policy de `announcement_parishes` (un coordinator solo puede linkear a sus parroquias).
> - `announcements_coordinator_update` / `announcements_coordinator_delete`: solo si la fila ya está linkeada a una parroquia donde el user es coordinator (`is_coordinator_of_announcement(id)`).
> - Admin/editor: cubiertos por `announcements_editor_all`.

> **Deduplicación:** la consulta de la home devuelve cada anuncio una sola vez aunque el usuario esté asociado a varias parroquias destinatarias del mismo anuncio.

> **target_kind = 'document':** el anuncio enlaza a un documento rich asociado 1:1 en `announcement_documents` (no usa `target_id` ni `target_url`). En la home/popup el atajo lleva a `/anuncios/{id}`.

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

### `announcement_documents`
Documento rich (HTML) asociado 1:1 a un anuncio (mig. 0034). Solo existe cuando el anuncio tiene `target_kind='document'` **y** el editor lo guardó al menos una vez. Se renderiza en `/anuncios/{id}` con el contenido **saneado por DOMPurify** antes de insertarlo en el DOM. El editor admin es TipTap (`/admin/anuncios/{id}/documento`) y soporta pegado preservando formato desde Word/Google Docs/web.

| Columna           | Tipo        | Notas                                                          |
| ----------------- | ----------- | -------------------------------------------------------------- |
| `announcement_id` | uuid        | PK, FK → `announcements.id` ON DELETE CASCADE                  |
| `content_html`    | text        | HTML rich; NOT NULL, default `''`                              |
| `updated_at`      | timestamptz | default now(), trigger `set_updated_at`                        |

> **RLS:** lectura abierta a través de `announcement_is_visible_to_user(announcement_id)` (que en mig. 0035 devuelve siempre true) + admin + coordinator. Escritura: admin/editor global o coordinator de alguna parroquia destinataria del anuncio.

---

## Buckets de Supabase Storage

| Bucket        | Contenido                       | Acceso                                                                                 |
| ------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| `partituras`  | PDFs de partituras              | lectura pública (solo `published`); escritura: Coordinador/Editor; revisión: Editor    |
| `audios`      | mp3/ogg de referencia           | lectura pública (solo `published`); escritura: Coordinador/Editor; revisión: Editor    |
| `parishes`    | logos / imágenes de parroquia   | lectura pública; escritura: admin                                                      |
| `images`      | imágenes de cards (playlists/anuncios) — mig. 0023, restaurado en mig. 0041 | lectura pública; escritura: editor o coordinator (autenticado, dueño del objeto); update/delete: editor o dueño |

> RLS de Storage verifica que el `song_files` que apunta al objeto pertenezca a una canción en `songs.status = 'published'` (vía join) antes de permitir lectura pública. Si la canción está en `draft`/`review`/`archived`, los archivos solo son visibles para el uploader y Editor/Admin.

---

## Trazabilidad CU → Tabla

| CU      | Tablas involucradas                                                                |
| ------- | ---------------------------------------------------------------------------------- |
| CU-01   | `songs`, `playlists`, `parishes`, `categories`                                     |
| CU-02   | `songs`, `authors`, `categories`, `song_versions` (lectura)                        |
| CU-03   | `songs`, `user_song_keys` (autenticado), `playlist_songs.key_override` (contexto playlist), `localStorage` (anónimo) |
| CU-04   | `songs.youtube_url`                                                                |
| CU-05   | `playlists`, `playlist_songs`, `songs`, `parishes`, `entity_schedules`             |
| CU-06.1 | `parishes`                                                                         |
| CU-06.2 | `parishes`, `playlists`                                                            |
| CU-07   | `announcements`, `announcement_parishes`, `announcement_documents`, `entity_schedules`, `playlists` |
| CU-08   | — (cliente)                                                                        |
| CU-09   | `song_files`, bucket `partituras`                                                  |
| CU-10   | `songs`                                                                            |
| CU-11   | `playlists`, `playlist_songs`, `songs`                                             |
| CU-12   | — (genera QR de la URL actual)                                                     |
| CU-13   | `auth.users` (Supabase), `users`                                                   |
| CU-14   | `users`, `parish_members`, `parishes`                                              |
| CU-15   | `favorites`                                                                        |
| CU-16   | `songs`, `song_versions`, `song_files`, `authors`, `categories` (flujo `draft → review → published`) |
| CU-17   | `playlists`, `playlist_songs`, `parish_members`, `entity_schedules`                |
| CU-18   | `users`, `user_roles`                                                              |
| CU-19   | `parishes`                                                                         |
| CU-20   | `roles`, `permissions`, `role_permissions`, `user_roles`                           |
| CU-21   | `announcements`, `announcement_parishes`, `announcement_documents`, `entity_schedules`, `parish_members` |
| CU-22   | `favorites`                                                                        |
