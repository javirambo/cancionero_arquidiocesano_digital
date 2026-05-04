-- =============================================================
-- Migración: 0015_song_review_workflow
-- CU-16: flujo editorial draft → review → published / rejected.
--
-- Cuatro RPC SECURITY DEFINER que hacen las transiciones de estado
-- de canciones de manera atómica: status + snapshot en song_versions
-- (al publicar) + arrastre de song_files al mismo estado, todo en
-- una sola transacción. Sin esto el cliente tendría que orquestar
-- varios UPDATE/INSERT y arriesgar inconsistencias si alguno falla.
--
-- Validan permiso (is_editor / is_admin / dueño) y estado adentro,
-- devolviendo error claro si no corresponde. La RLS sobre las tablas
-- se mantiene; las funciones bypassan via SECURITY DEFINER porque
-- necesitan tocar song_versions y song_files atómicamente.
--
-- IMPORTANTE: aplicar después de 0014.
-- =============================================================

-- ---------------------------------------------------------------------
-- submit_song_for_review
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

  update public.song_files
     set status       = 'review',
         submitted_by = v_uid,
         submitted_at = now()
   where song_id = p_song_id
     and status  = 'draft';
end;
$$;

grant execute on function public.submit_song_for_review(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- withdraw_song_from_review
-- ---------------------------------------------------------------------
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

  update public.song_files
     set status       = 'draft',
         submitted_by = null,
         submitted_at = null
   where song_id = p_song_id
     and status  = 'review';
end;
$$;

grant execute on function public.withdraw_song_from_review(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- approve_song
-- ---------------------------------------------------------------------
create or replace function public.approve_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_status  text;
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

  -- Lock pesimista para que dos editores aprobando en simultáneo no
  -- choquen contra el unique (song_id, version) de song_versions.
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

  update public.song_files
     set status       = 'published',
         reviewed_by  = v_uid,
         reviewed_at  = v_now,
         published_at = v_now
   where song_id = p_song_id
     and status  = 'review';
end;
$$;

grant execute on function public.approve_song(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- reject_song
-- ---------------------------------------------------------------------
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

  update public.song_files
     set status       = 'rejected',
         reviewed_by  = v_uid,
         reviewed_at  = v_now,
         review_notes = p_notes
   where song_id = p_song_id
     and status  = 'review';
end;
$$;

grant execute on function public.reject_song(uuid, text) to authenticated;
