-- =====================================================================
-- Cancionero Arquidiocesano Digital — Storage buckets
-- Migración: 0014_storage_buckets
--
-- Crea los buckets `partituras` y `audios` referenciados desde
-- lib/supabase/storage.ts y aplica políticas RLS sobre storage.objects
-- alineadas con las políticas de public.song_files (ver 0002_rls_policies).
--
-- Modelo:
--   - Buckets privados (public = false). El acceso al contenido se hace
--     vía signed URLs o lectura autenticada controlada por RLS.
--   - SELECT permitido si:
--       * existe un song_files publicado que referencia el objeto, o
--       * el usuario es editor/admin, o
--       * el usuario es el owner del objeto (uploaded_by).
--   - INSERT permitido a coordinator/editor/admin autenticados; la
--     coherencia fina (song en draft propia, etc.) la enforce la tabla
--     public.song_files al insertar la fila correspondiente.
--   - UPDATE/DELETE permitido al owner o editor/admin.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('partituras', 'partituras', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('audios', 'audios', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Políticas RLS sobre storage.objects para estos buckets
-- ---------------------------------------------------------------------

-- SELECT: published vía song_files, editor/admin, u owner.
drop policy if exists song_assets_select on storage.objects;
create policy song_assets_select
  on storage.objects for select
  using (
    bucket_id in ('partituras', 'audios')
    and (
      public.is_editor()
      or owner = auth.uid()
      or exists (
        select 1
        from public.song_files sf
        where sf.bucket = storage.objects.bucket_id
          and sf.path   = storage.objects.name
          and sf.status = 'published'
      )
    )
  );

-- INSERT: coordinator (cualquiera) o editor/admin, autenticado y dueño.
drop policy if exists song_assets_insert on storage.objects;
create policy song_assets_insert
  on storage.objects for insert
  with check (
    bucket_id in ('partituras', 'audios')
    and auth.uid() is not null
    and owner = auth.uid()
    and (
      public.is_editor()
      or public.is_any_coordinator()
    )
  );

-- UPDATE: el dueño del objeto, o editor/admin.
drop policy if exists song_assets_update on storage.objects;
create policy song_assets_update
  on storage.objects for update
  using (
    bucket_id in ('partituras', 'audios')
    and (
      public.is_editor()
      or owner = auth.uid()
    )
  )
  with check (
    bucket_id in ('partituras', 'audios')
    and (
      public.is_editor()
      or owner = auth.uid()
    )
  );

-- DELETE: el dueño del objeto, o editor/admin.
drop policy if exists song_assets_delete on storage.objects;
create policy song_assets_delete
  on storage.objects for delete
  using (
    bucket_id in ('partituras', 'audios')
    and (
      public.is_editor()
      or owner = auth.uid()
    )
  );
