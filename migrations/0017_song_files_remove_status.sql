-- =====================================================================
-- Cancionero Arquidiocesano Digital
-- Migración: 0017_song_files_remove_status
--
-- Decisión: los archivos adjuntos a una canción ya no tienen workflow
-- editorial propio. La visibilidad de un song_file deriva del status
-- de la canción a la que pertenece. Si la canción está publicada, sus
-- archivos también se consideran publicados.
--
-- Cambios:
--   1. Drop de las 4 policies viejas de public.song_files que dependían
--      de song_files.status.
--   2. Drop de la policy storage.objects "song_assets_select" que
--      joineaba contra song_files.status.
--   3. Drop de columnas del workflow editorial en public.song_files:
--      status, submitted_by, submitted_at, reviewed_by, reviewed_at,
--      review_notes, published_at. También el índice por status.
--   4. Recreación de policies de song_files que delegan en songs.status.
--   5. Recreación de song_assets_select sobre storage.objects.
--   6. Recreación de las funciones del workflow editorial
--      (submit/withdraw/approve/reject/unpublish) sin tocar song_files.
--
-- IMPORTANTE: aplicar después de 0016. Los archivos que estaban en
-- 'draft' se vuelven visibles si su canción está publicada (lo cual,
-- por construcción del workflow previo, no debería ocurrir: una canción
-- publicada solo tenía archivos publicados; el unpublish bajaba ambos
-- a draft). Para canciones en draft/review/rejected, los archivos
-- siguen no siendo visibles públicamente porque la canción no lo es.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Drop policies viejas de song_files
-- ---------------------------------------------------------------------
drop policy if exists song_files_select_published   on public.song_files;
drop policy if exists song_files_coordinator_insert on public.song_files;
drop policy if exists song_files_coordinator_update on public.song_files;
drop policy if exists song_files_coordinator_delete on public.song_files;
drop policy if exists song_files_editor_all         on public.song_files;

-- ---------------------------------------------------------------------
-- 2. Drop policy de Storage que dependía de song_files.status
-- ---------------------------------------------------------------------
drop policy if exists song_assets_select on storage.objects;

-- ---------------------------------------------------------------------
-- 3. Drop columnas e índice del workflow editorial en song_files
-- ---------------------------------------------------------------------
drop index if exists public.song_files_status_idx;

alter table public.song_files
  drop column if exists status,
  drop column if exists submitted_by,
  drop column if exists submitted_at,
  drop column if exists reviewed_by,
  drop column if exists reviewed_at,
  drop column if exists review_notes,
  drop column if exists published_at;

-- ---------------------------------------------------------------------
-- 4. Recrear policies de song_files (sin status, derivando de songs)
-- ---------------------------------------------------------------------

-- SELECT: visible si la canción está publicada (lectura pública), o
-- editor/admin, o el usuario que subió el archivo (para revisión propia).
create policy song_files_select
  on public.song_files for select
  using (
    exists (
      select 1 from public.songs s
      where s.id = song_id
        and s.status = 'published'
    )
    or public.is_editor()
    or uploaded_by = auth.uid()
  );

-- INSERT: coordinador sobre canción propia que aún no esté archivada,
-- o editor/admin sin restricciones.
create policy song_files_coordinator_insert
  on public.song_files for insert
  with check (
    public.is_editor()
    or (
      public.is_any_coordinator()
      and uploaded_by = auth.uid()
      and exists (
        select 1 from public.songs s
        where s.id = song_id
          and s.created_by = auth.uid()
          and s.status in ('draft','rejected','review','published')
      )
    )
  );

-- UPDATE: uploader (coordinador) o editor/admin.
create policy song_files_update
  on public.song_files for update
  using (
    public.is_editor()
    or (uploaded_by = auth.uid() and public.is_any_coordinator())
  )
  with check (
    public.is_editor()
    or (uploaded_by = auth.uid() and public.is_any_coordinator())
  );

-- DELETE: uploader (coordinador) o editor/admin.
create policy song_files_delete
  on public.song_files for delete
  using (
    public.is_editor()
    or (uploaded_by = auth.uid() and public.is_any_coordinator())
  );

-- ---------------------------------------------------------------------
-- 5. Recrear policy SELECT sobre storage.objects
-- ---------------------------------------------------------------------
-- Visible si: editor/admin, dueño del objeto, o existe un song_files
-- que apunta al objeto y la canción está publicada.
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
        join public.songs s on s.id = sf.song_id
        where sf.bucket = storage.objects.bucket_id
          and sf.path   = storage.objects.name
          and s.status  = 'published'
      )
    )
  );

-- ---------------------------------------------------------------------
-- 6. Recrear funciones del workflow editorial sin tocar song_files
-- ---------------------------------------------------------------------

-- submit_song_for_review (de 0015, sin update a song_files)
create or replace function public.submit_song_for_review(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
  v_owner  uuid;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select status, created_by into v_status, v_owner
  from public.songs where id = p_song_id;

  if v_status is null then
    raise exception 'song not found' using errcode = 'P0002';
  end if;

  if not (public.is_editor() or public.is_admin() or v_owner = v_uid) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if v_status not in ('draft','rejected') then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status       = 'review',
         submitted_by = v_uid,
         submitted_at = now(),
         review_notes = null
   where id = p_song_id;
end;
$$;

-- withdraw_song_from_review (de 0015, sin update a song_files)
create or replace function public.withdraw_song_from_review(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
  v_owner  uuid;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select status, created_by into v_status, v_owner
  from public.songs where id = p_song_id;

  if v_status is null then
    raise exception 'song not found' using errcode = 'P0002';
  end if;

  if not (public.is_editor() or public.is_admin() or v_owner = v_uid) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if v_status <> 'review' then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status       = 'draft',
         submitted_by = null,
         submitted_at = null
   where id = p_song_id;
end;
$$;

-- approve_song (de 0015, sin update a song_files)
create or replace function public.approve_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_version int;
  v_now     timestamptz := now();
  s         record;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into s from public.songs where id = p_song_id for update;
  if not found then
    raise exception 'song not found' using errcode = 'P0002';
  end if;
  if s.status <> 'review' then
    raise exception 'invalid transition from %', s.status using errcode = 'P0001';
  end if;

  v_version := coalesce(s.current_version, 0) + 1;

  insert into public.song_versions (
    song_id, version, title, body, original_key, tempo_bpm, tags,
    youtube_url, author_id, category_id,
    submitted_by, reviewed_by, published_at
  ) values (
    s.id, v_version, s.title, s.body, s.original_key, s.tempo_bpm, s.tags,
    s.youtube_url, s.author_id, s.category_id,
    s.submitted_by, v_uid, v_now
  );

  update public.songs
     set status          = 'published',
         current_version = v_version,
         reviewed_by     = v_uid,
         reviewed_at     = v_now,
         published_at    = v_now,
         review_notes    = null
   where id = p_song_id;
end;
$$;

-- reject_song (de 0015, sin update a song_files)
create or replace function public.reject_song(p_song_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
  v_now    timestamptz := now();
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if p_notes is null or length(btrim(p_notes)) = 0 then
    raise exception 'review_notes required' using errcode = '23514';
  end if;

  select status into v_status from public.songs where id = p_song_id;
  if v_status is null then
    raise exception 'song not found' using errcode = 'P0002';
  end if;
  if v_status <> 'review' then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status       = 'rejected',
         reviewed_by  = v_uid,
         reviewed_at  = v_now,
         review_notes = p_notes
   where id = p_song_id;
end;
$$;

-- unpublish_song (de 0016, sin update a song_files)
create or replace function public.unpublish_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select status into v_status from public.songs where id = p_song_id;
  if v_status is null then
    raise exception 'song not found' using errcode = 'P0002';
  end if;
  if v_status <> 'published' then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status       = 'draft',
         submitted_by = null,
         submitted_at = null,
         reviewed_by  = null,
         reviewed_at  = null,
         published_at = null,
         review_notes = null
   where id = p_song_id;
end;
$$;
