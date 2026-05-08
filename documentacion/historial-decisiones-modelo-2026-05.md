# Historial de decisiones — Modelo de datos (2026-05)

Decisiones de modelo y su justificación. Una entrada por cambio significativo.

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
