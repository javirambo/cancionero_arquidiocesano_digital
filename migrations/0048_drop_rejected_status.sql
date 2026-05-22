-- =====================================================================
-- Cancionero Arquidiocesano Digital — Eliminar el estado 'rejected'
-- Migración: 0048_drop_rejected_status
-- =====================================================================
--
-- Contexto:
--   El estado 'rejected' y el RPC `reject_song` vienen del flujo
--   editorial original, cuando el Coordinador parroquial cargaba
--   canciones y el Editor las revisaba/rechazaba. Desde el cambio del
--   2026-05-15 solo el Editor/Admin gestiona el cantoral, por lo que el
--   rechazo dejó de tener sentido (un editor no se rechaza a sí mismo).
--
--   Se conserva el estado 'review' (sirve cuando un segundo editor
--   valida): desde 'review' solo se puede aprobar o devolver a borrador
--   (`withdraw_song_from_review`).
--
-- Precondición verificada: no hay filas con songs.status = 'rejected'
-- ni eventos song_events.event = 'rejected'.
--
-- Cambios:
--   1. songs: nuevo CHECK de status sin 'rejected'.
--   2. songs: eliminar constraint `songs_review_notes_required` y la
--      columna `review_notes` (solo se usaba para notas de rechazo).
--   3. Eliminar el RPC `reject_song`.
--   4. song_events: nuevo CHECK de event sin 'rejected'.
--   5. Recrear `submit_song_for_review`: la transición ya no admite
--      'rejected' como estado de origen (solo 'draft').
--   6. Recrear `approve_song`, `unpublish_song` y `archive_song` sin la
--      escritura a `review_notes` (columna eliminada en el paso 2).
--   7. Recrear la policy `songs_select_published` sin 'rejected'.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. songs.status — nuevo CHECK sin 'rejected'
-- ---------------------------------------------------------------------
alter table public.songs drop constraint songs_status_check;
alter table public.songs add constraint songs_status_check
  check (status in ('draft','review','published','archived'));

-- ---------------------------------------------------------------------
-- 2. songs.review_notes — eliminar constraint y columna
-- ---------------------------------------------------------------------
alter table public.songs drop constraint songs_review_notes_required;
alter table public.songs drop column review_notes;

-- ---------------------------------------------------------------------
-- 3. Eliminar el RPC reject_song
-- ---------------------------------------------------------------------
drop function if exists public.reject_song(uuid, text);

-- ---------------------------------------------------------------------
-- 4. song_events.event — nuevo CHECK sin 'rejected'
-- ---------------------------------------------------------------------
alter table public.song_events drop constraint song_events_event_check;
alter table public.song_events add constraint song_events_event_check
  check (event in (
    'created', 'submitted', 'withdrawn', 'published', 'edited',
    'unpublished', 'archived', 'unarchived', 'restored'
  ));

-- ---------------------------------------------------------------------
-- 5. submit_song_for_review — origen solo 'draft' (sin 'rejected')
-- ---------------------------------------------------------------------
create or replace function public.submit_song_for_review(p_song_id uuid)
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
  if v_status <> 'draft' then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status       = 'review',
         submitted_by = v_uid,
         submitted_at = now()
   where id = p_song_id;

  perform public.log_song_event(p_song_id, 'submitted');
end;
$$;

-- ---------------------------------------------------------------------
-- 6a. approve_song — sin la escritura a review_notes (columna eliminada)
-- ---------------------------------------------------------------------
create or replace function public.approve_song(
  p_song_id        uuid,
  p_change_summary text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_now     timestamptz := now();
  v_version int;
  v_summary text;
  s         public.songs;
begin
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

  v_summary := coalesce(
    nullif(btrim(p_change_summary), ''),
    public.build_change_summary(p_song_id)
  );

  v_version := coalesce(s.current_version, 0) + 1;

  insert into public.song_versions (
    song_id, version, title, body, original_key, tempo_bpm,
    youtube_url, author_id, change_summary,
    submitted_by, reviewed_by, published_at
  ) values (
    s.id, v_version, s.title, s.body, s.original_key, s.tempo_bpm,
    s.youtube_url, s.author_id, v_summary,
    s.submitted_by, v_uid, v_now
  );

  insert into public.song_version_categories (song_id, version, category_id)
  select s.id, v_version, sc.category_id
    from public.song_categories sc
   where sc.song_id = s.id;

  update public.songs
     set status          = 'published',
         current_version = v_version,
         reviewed_by     = v_uid,
         reviewed_at     = v_now,
         published_at    = v_now
   where id = p_song_id;

  perform public.log_song_event(p_song_id, 'published', v_version, v_summary);
end;
$$;

-- ---------------------------------------------------------------------
-- 6b. unpublish_song — sin la escritura a review_notes
-- ---------------------------------------------------------------------
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

  select status into v_status from public.songs where id = p_song_id for update;
  if not found then
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
         published_at = null
   where id = p_song_id;

  perform public.log_song_event(p_song_id, 'unpublished');
end;
$$;

-- ---------------------------------------------------------------------
-- 6c. archive_song — sin la escritura a review_notes
-- ---------------------------------------------------------------------
create or replace function public.archive_song(p_song_id uuid)
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
  if v_status = 'archived' then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status       = 'archived',
         number       = null,
         submitted_by = null,
         submitted_at = null,
         reviewed_by  = null,
         reviewed_at  = null,
         published_at = null
   where id = p_song_id;

  perform public.log_song_event(p_song_id, 'archived');
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Policy songs_select_published — sin 'rejected'
-- ---------------------------------------------------------------------
drop policy if exists songs_select_published on public.songs;
create policy songs_select_published
  on public.songs for select
  using (
    status = 'published'
    or public.is_editor()
    or (created_by = auth.uid() and status in ('draft','review'))
  );

commit;
