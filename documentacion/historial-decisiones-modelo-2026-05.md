# Historial de decisiones — Modelo de datos (2026-05)

Decisiones de modelo y su justificación. Una entrada por cambio significativo.

---

## 2026-05-08 — Alta de canción con número auto-asignado (RPC `create_blank_song`)

**Migración:** `0024_create_blank_song.sql` (aplicada).

### Contexto

Hasta ahora, "+ Nuevo canto" insertaba con `number = NULL` y el coordinador/editor debía completarlo a mano. Pedido: que el sistema asigne automáticamente el próximo número disponible (`max(number) + 1`) sobre todas las canciones (incluso archivadas) — los huecos no se reusan.

### Decisiones

1. **`create_blank_song(p_title text default 'Nuevo canto') returns table(id uuid, number int)`**: editor/admin/coordinator. Inserta `status='draft'`, `created_by=auth.uid()`, slug `nueva-cancion-<epoch_ms>`, `body=''`.
2. **Anti-carrera con `pg_advisory_xact_lock`**: dos usuarios creando en simultáneo podrían resolver el mismo `max + 1` y violar `songs_number_unique`. El advisory lock con clave fija (hash de `'songs.next_number'`) serializa el cálculo dentro de la transacción; se libera al commit.
3. **No se reusan huecos**: `max(number)` se calcula sobre **todos** los estados (incluido `archived`), porque liberar números dejaría huérfanas las referencias históricas en cancioneros impresos.

### Alternativas consideradas y descartadas

- **Numeración por secuencia (`bigserial`/`sequence`)**: descartado. Una secuencia salta huecos al hacer rollback y no se puede consultar atómicamente con `INSERT ... RETURNING` sin perder números en errores; el cálculo `max+1` con advisory lock es más predecible y cumple el requisito.
- **Resolver el número en el cliente**: descartado. Sin lock no hay forma de evitar la carrera, y mover la lógica al servidor mantiene la regla en un solo lugar.

### Impacto

- **DB**: una RPC nueva con `SECURITY DEFINER` y guard de rol.
- **UI**: el botón "+ Nuevo" del listado admin de canciones llama directo al RPC y navega al editor con la canción ya creada y numerada.

---

## 2026-05-08 — Imágenes en cards de playlists y anuncios (bucket `images`)

**Migración:** `0023_card_images.sql` (aplicada).

### Contexto

Las cards de playlists y anuncios en la home eran solo texto. Pedido: poder asociar una imagen opcional a cada una para enriquecer visualmente la home y los listados.

### Decisiones

1. **Columnas `image_path text` (nullable)** en `playlists` y `announcements`. Guardan el path relativo dentro del bucket; la URL pública se reconstruye en `lib/supabase/storage.ts:getPublicImageUrl`.
2. **Bucket `images` público** (lectura abierta, sin signed URLs). Es contenido visual de cards públicas; no hay nada confidencial.
3. **Una sola carpeta `/images`** sin segregar por entidad. Pocas imágenes esperadas; segmentar por subcarpeta agrega complejidad sin beneficio.
4. **RLS sobre `storage.objects`**:
   - **SELECT**: público (anon + authenticated).
   - **INSERT**: autenticado + `owner = auth.uid()` + (`is_editor()` o `is_any_coordinator()`). Los coordinators suben imágenes para sus propios anuncios.
   - **UPDATE/DELETE**: editor/admin **o** dueño del objeto (el coordinator que lo subió puede mantenerlo).
5. **Validación cliente** en `ImageUploadField`: JPG/PNG/WEBP, máximo 2 MB. Al cambiar la imagen, se elimina la anterior del bucket antes de subir la nueva (no se acumulan huérfanos en uso normal).

### Alternativas consideradas y descartadas

- **Bucket por entidad** (`playlist-images`, `announcement-images`): descartado. Mismo régimen RLS, misma audiencia, no había razón para duplicar configuración.
- **Bucket privado + signed URLs**: descartado. Las imágenes se renderizan en home pública y para anónimos; pagar el costo de firmar URLs no aporta nada.

### Impacto

- **DB**: dos columnas nullable + un bucket nuevo + 4 policies sobre `storage.objects`.
- **UI**: nuevos componentes `ImageUploadField` (form) y `CardWithImage` (render con franja izquierda de 75px). `announcement-card.tsx` y `playlist-card.tsx` usan el nuevo componente.

---

## 2026-05-08 — Activación del estado `archived` (RPCs `archive_song` / `unarchive_song`)

**Migración:** `0022_archive_song.sql` (aplicada).

### Contexto

El estado `archived` existía en `songs.status` desde la mig. 0001 pero **no había forma de llegar a él**: no había RPC, ni botón, ni acción. El listado admin tenía la pestaña "Archivados" y el badge tenía estilo, pero el estado era inalcanzable.

CU-16 documentaba el archivado como "baja lógica" del flujo editorial. Esta migración cubre el gap.

### Decisiones

1. **`archive_song(p_song_id)`**: editor/admin, válido desde cualquier estado salvo `archived`. Limpia campos de flujo (`submitted_*`, `reviewed_*`, `published_at`, `review_notes`) para no dejar trazas inconsistentes si la canción se desarchiva más adelante. Mantiene `song_versions` intacto.
2. **`unarchive_song(p_song_id)`**: simétrica. Solo desde `archived`, vuelve a `draft`. Si querés republicar, pasa por el flujo normal (`draft → review → published`).
3. **No hay borrado físico** (alternativa B descartada). El archivado cubre los casos reales (canción que ya no se usa) sin romper integridad histórica de playlists ni versiones. Si en el futuro aparece un caso real de error de carga que justifique borrado físico, se evalúa.
4. **UI**: botón "Archivar" en `ReviewActions` con **doble confirmación** (CU-16) y redirect al listado tras éxito; "Desarchivar" simétrico desde estado `archived`.

### Alternativas consideradas y descartadas

- **B) Borrado físico de canciones**: descartado. Riesgo alto sobre `playlist_songs` (FK `ON DELETE RESTRICT`), `song_versions` y `song_categories`. El archivado resuelve el 99% de los casos.
- **`unarchive_song` → `published` directo**: descartado. Volver a `draft` fuerza una revisión consciente antes de re-exponer en público — más seguro, más simétrico con el flujo existente.

### Impacto

- **DB**: dos RPCs nuevas con `SECURITY DEFINER` y guard de rol. RLS sin cambios (la policy `songs_editor_all` ya cubría).
- **UI**: `ReviewActions` extendido con dos nuevas capabilities (`canArchive`, `canUnarchive`).
- **Documentación**: CU-16, manual admin (tabla 4.1 y glosario).

---

## 2026-05-07 — Multi-categoría por canción + drop de `tags`

**Migración:** `0021_songs_multi_category_drop_tags.sql` (aplicada).

### Contexto

Hasta esta migración, `songs.category_id` permitía **una sola** categoría litúrgica por canción (FK 1:N). En la práctica una canción puede ser apta para múltiples momentos de la misa (Entrada y Salida, Comunión y Mariana, etc.), por lo que el modelo 1:N era insuficiente.

Aprovechando el cambio, se evaluó el campo `songs.tags` (`text[]`) — texto libre sin filtros, búsqueda ni vista pública que lo consumiera. No se usaba.

### Decisiones

1. **Pasar a N:M**: nueva tabla pivote `song_categories(song_id, category_id)` con FKs `ON DELETE CASCADE`. Análogo `song_version_categories(song_id, version, category_id)` para snapshots por versión publicada.
2. **Eliminar `songs.tags`** (y `song_versions.tags`): no se estaba usando en producción.
3. **Mantener la tabla `categories`**: vocabulario controlado, sigue siendo administrable. Se descartó la opción "todo a tags libres" para no perder validación, ordenamiento (`sort_order`) ni catálogo consistente.
4. **No crear ABM de `categories`**: el catálogo es estable (~18 entradas que cubren las clases litúrgicas estándar). Hoy se gestiona por SQL. Si en el futuro hace falta UI, se puede agregar bajo `/admin/categorias`.

### Alternativas consideradas y descartadas

- **A) Solo `tags` text[] multi-valor**: descartado. Pierde integridad referencial (typos), `sort_order` y la separación entre clase litúrgica controlada vs etiquetas libres.
- **C) Híbrido `category_id` principal + `tags`**: descartado. No resuelve "una canción en múltiples momentos litúrgicos".
- **B) N:M sin tocar tags**: parcialmente adoptado — se hizo N:M y además se aprovechó para drop de `tags` por inutilizado.

### Impacto técnico

- **Backfill**: 416 filas en `song_categories` y 21 en `song_version_categories` (datos previos preservados).
- **RPCs reescritas**: `search_songs` y `search_global` usan join via pivote y `string_agg(c.name, ', ' order by sort_order, name)`. El contrato del campo `category text` (cadena concatenada) se mantiene para no romper consumidores.
- **`approve_song` reescrita**: al publicar, copia las categorías vigentes de `song_categories` a `song_version_categories`.
- **RLS**: ambas pivotes con `select` abierto y `insert/update/delete` solo para `is_editor() or is_admin()`.
- **Tipos en `lib/songs-admin.ts`**: `AdminSongDetail.category_ids: string[]` reemplaza `category_id: string | null`. `tags` removido.
- **Tipos en `lib/songs.ts`**: `Song.categories: string[]` para vista pública (chips). Listados (`SongSummary`) mantienen `category: string | null` con la concatenación.
- **UI**:
  - Form admin: `<select>` único reemplazado por **chips clicables** (toggle multi-selección). Input de "Etiquetas" eliminado.
  - Vista pública: chips bajo el título mostrando todas las categorías de la canción.
  - Listado admin y search dialog: muestran la concatenación coma-separada.

### CUs afectados

- **CU-25** reescrito: pasa de "creación de categoría on-demand desde el form" a "asignación N:M implementada + ABM no implementado por catálogo estable".
- **CU-01, CU-02, CU-16, CU-16.1**: actualizados para reflejar multi-categoría y eliminación de tags.

### Documentación afectada

- `documentacion/modelo_de_datos.md`: secciones `categories`, `songs`, `song_versions` actualizadas. Agregadas `song_categories` y `song_version_categories`.
- `documentacion/casos_de_uso.md`: tabla CU, roles, CU-01, CU-02.x, CU-16, CU-16.1, CU-25.
- `documentacion/manual_de_uso.md`: cabecera de vista de canción.
- `documentacion/manual_de_uso_admin.md`: listado y editor de canción (Metadatos).
- `documentacion/especificacion_tecnica.md`: RF22 y modelo conceptual.
