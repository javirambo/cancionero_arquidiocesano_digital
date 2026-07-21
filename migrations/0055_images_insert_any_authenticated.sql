-- =====================================================================
-- Cancionero Arquidiocesano Digital — Members suben imágenes de sus listas
-- Migración: 0055_images_insert_any_authenticated
--
-- Contexto:
--   Con las listas PERSONALES habilitadas para cualquier usuario, un
--   `member` (sin rol editor/admin ni coordinación) necesita poder subir
--   la imagen de su lista al bucket `images`. La policy vigente
--   (`images_insert`, mig. 0041) exige `is_editor() OR is_any_coordinator()`,
--   así que el member recibía 403 "new row violates row-level security
--   policy" al subir la imagen.
--
-- Cambio:
--   images_insert: permite a CUALQUIER usuario autenticado subir objetos al
--   bucket `images` mientras sea el dueño del objeto (owner = auth.uid()).
--   Las policies images_update / images_delete (mig. 0041) ya permiten al
--   dueño operar sobre sus objetos, así que el member también puede
--   reemplazar/borrar la imagen de su lista.
--
-- Nota: el bucket `images` es compartido y de lectura pública; con este
-- cambio cualquier autenticado puede subir imágenes, acotado a que cada uno
-- solo maneja sus propios objetos.
-- =====================================================================

drop policy if exists images_insert on storage.objects;
create policy images_insert
  on storage.objects for insert
  with check (
    bucket_id = 'images'
    and auth.uid() is not null
    and owner = auth.uid()
  );
