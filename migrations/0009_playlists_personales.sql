-- =============================================================
-- Migración: 0009_playlists_personales
-- Permite playlists personales del rol `member`: parish_id puede ser NULL.
-- Una playlist con parish_id IS NULL es de propiedad del usuario que la
-- creó (`created_by`).
--
-- Cambios:
--   1. `playlists.parish_id` pasa a nullable.
--   2. RLS de `playlists` se extiende para que el `created_by` pueda
--      acceder a su propia playlist cuando parish_id IS NULL.
--   3. RLS de `playlist_songs` se extiende para que el `created_by` de
--      la playlist (cuando es personal) pueda gestionar sus canciones.
--
-- IMPORTANTE: aplicar después de 0008.
-- =============================================================

-- 1. parish_id nullable
alter table public.playlists
  alter column parish_id drop not null;

-- 2. RLS de playlists
-- SELECT: además de las visibilidades públicas y los roles editoriales,
-- el dueño puede ver sus playlists personales (también las private).
drop policy if exists playlists_select on public.playlists;
create policy playlists_select
  on public.playlists for select
  using (
    visibility in ('public','unlisted')
    or is_archdiocesan
    or public.is_editor()
    or public.is_coordinator_of(parish_id)
    or (parish_id is null and created_by = auth.uid())
  );

-- INSERT: además de admin/coordinator, un usuario autenticado puede
-- crear una playlist personal (parish_id IS NULL) propia.
drop policy if exists playlists_insert on public.playlists;
create policy playlists_insert
  on public.playlists for insert
  with check (
    public.is_admin()
    or (public.is_coordinator_of(parish_id) and created_by = auth.uid())
    or (parish_id is null and created_by = auth.uid())
  );

-- UPDATE: el dueño puede modificar su playlist personal.
drop policy if exists playlists_update on public.playlists;
create policy playlists_update
  on public.playlists for update
  using (
    public.is_admin()
    or public.is_coordinator_of(parish_id)
    or (parish_id is null and created_by = auth.uid())
  )
  with check (
    public.is_admin()
    or public.is_coordinator_of(parish_id)
    or (parish_id is null and created_by = auth.uid())
  );

-- DELETE: el dueño puede borrar su playlist personal.
drop policy if exists playlists_delete on public.playlists;
create policy playlists_delete
  on public.playlists for delete
  using (
    public.is_admin()
    or public.is_coordinator_of(parish_id)
    or (parish_id is null and created_by = auth.uid())
  );

-- 3. RLS de playlist_songs: el dueño de una playlist personal puede
-- gestionar sus canciones.
drop policy if exists playlist_songs_write on public.playlist_songs;
create policy playlist_songs_write
  on public.playlist_songs for all
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (
          public.is_admin()
          or public.is_editor()
          or public.is_coordinator_of(p.parish_id)
          or (p.parish_id is null and p.created_by = auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (
          public.is_admin()
          or public.is_editor()
          or public.is_coordinator_of(p.parish_id)
          or (p.parish_id is null and p.created_by = auth.uid())
        )
    )
  );
