-- =====================================================================
-- Cancionero Arquidiocesano Digital — Tipo de archivo "imagen"
-- Migración: 0051_song_files_image_kind
-- Referencia: documentacion/modelo_de_datos.md (song_files.kind).
--
-- Decisión: una canción puede tener imágenes adjuntas (kind='image'),
-- que se muestran en la vista pública debajo del título y antes del
-- cuerpo de la canción.
--
-- Cambios:
--   1. Reemplazar el CHECK de song_files.kind para aceptar 'image'.
--
-- Notas:
--   - El CHECK original viene de 0001_initial_schema.sql (nombre
--     autogenerado por Postgres: song_files_kind_check) y no fue
--     modificado por ninguna migración posterior.
--   - Las imágenes se guardan en el bucket público `images` (creado en
--     0023_card_images.sql), no en `partituras`/`audios`. Se leen con
--     URL pública, sin signed URL. Las políticas de storage.objects para
--     ese bucket (images_select/insert/update/delete) ya cubren este uso
--     y no se tocan acá.
--   - No se agrega restricción de cantidad: una canción puede tener
--     varias imágenes y se muestran todas, en orden de subida.
-- =====================================================================

alter table public.song_files drop constraint song_files_kind_check;

alter table public.song_files add constraint song_files_kind_check
  check (kind in ('score_pdf','audio_mp3','audio_ogg','image','other'));
