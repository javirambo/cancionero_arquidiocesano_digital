-- =====================================================================
-- Cancionero Arquidiocesano Digital — Imágenes para cards
-- Migración: 0023_card_images
--
-- Agrega la columna image_path a `playlists` y `announcements` para
-- mostrar una imagen en las cards (home y vistas relacionadas).
--
-- Crea el bucket `images` (público, lectura abierta) y aplica políticas
-- RLS sobre storage.objects:
--   - SELECT: público (anon + authenticated).
--   - INSERT/UPDATE/DELETE: solo editor/admin (gestores de contenido).
--
-- Diseño: una sola carpeta /images para todas las imágenes de cards.
-- Pocas imágenes esperadas; no se segrega por entidad.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Columnas image_path
-- ---------------------------------------------------------------------
alter table public.playlists
  add column if not exists image_path text;

alter table public.announcements
  add column if not exists image_path text;

-- ---------------------------------------------------------------------
-- Bucket público
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;

-- ---------------------------------------------------------------------
-- Políticas RLS sobre storage.objects para bucket `images`
-- ---------------------------------------------------------------------

-- SELECT: público.
drop policy if exists images_select on storage.objects;
create policy images_select
  on storage.objects for select
  using (bucket_id = 'images');

-- INSERT: editor/admin o coordinator (los coordinators suben imágenes
-- para sus anuncios), autenticado y dueño del objeto.
drop policy if exists images_insert on storage.objects;
create policy images_insert
  on storage.objects for insert
  with check (
    bucket_id = 'images'
    and auth.uid() is not null
    and owner = auth.uid()
    and (
      public.is_editor()
      or public.is_any_coordinator()
    )
  );

-- UPDATE: editor/admin, coordinator dueño del objeto.
drop policy if exists images_update on storage.objects;
create policy images_update
  on storage.objects for update
  using (
    bucket_id = 'images'
    and (
      public.is_editor()
      or owner = auth.uid()
    )
  )
  with check (
    bucket_id = 'images'
    and (
      public.is_editor()
      or owner = auth.uid()
    )
  );

-- DELETE: editor/admin, o dueño del objeto (coordinator que lo subió).
drop policy if exists images_delete on storage.objects;
create policy images_delete
  on storage.objects for delete
  using (
    bucket_id = 'images'
    and (
      public.is_editor()
      or owner = auth.uid()
    )
  );
