-- =====================================================================
-- Cancionero Arquidiocesano Digital — Restringir canciones a editor/admin
-- Migración: 0037_restrict_songs_to_editors
--
-- Contexto:
--   Hasta ahora el rol "coordinator" (parish_members.role) podía crear
--   canciones en draft, editar sus propias canciones (draft/rejected/
--   review) y enviarlas/retirarlas de revisión. A partir de este cambio
--   SOLO editor/admin pueden crear, editar o borrar canciones.
--   El coordinador conserva la lectura de canciones publicadas (la
--   policy songs_select_published no se toca).
--
-- Cambios:
--   1. DROP policy songs_coordinator_insert (RLS sobre songs).
--   2. DROP policy songs_coordinator_update (RLS sobre songs).
--   3. REPLACE create_blank_song: quita la rama is_any_coordinator().
--   4. REPLACE submit_song_for_review: quita "v_owner = v_uid".
--   5. REPLACE withdraw_song_from_review: quita "v_owner = v_uid".
--
-- Drafts existentes creados por coordinadores NO se modifican: quedan
-- tal cual; solo editor/admin podrán continuarlos, publicarlos o
-- borrarlos desde ahora.
-- =====================================================================

drop policy if exists songs_coordinator_insert on public.songs;
drop policy if exists songs_coordinator_update on public.songs;

-- ---------------------------------------------------------------------
-- create_blank_song: solo editor/admin.
-- ---------------------------------------------------------------------
create or replace function public.create_blank_song(
  p_title text default 'Nuevo canto'
)
returns table(id uuid, number int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_number  int;
  v_id      uuid;
  v_slug    text;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(7732190827356291101);

  select coalesce(max(s.number), 0) + 1
    into v_number
    from public.songs s;

  v_slug := 'nueva-cancion-' || extract(epoch from now())::bigint::text;

  insert into public.songs as s (title, slug, body, status, number, created_by)
  values (p_title, v_slug, '', 'draft', v_number, v_uid)
  returning s.id into v_id;

  return query select v_id, v_number;
end;
$$;

grant execute on function public.create_blank_song(text) to authenticated;

-- ---------------------------------------------------------------------
-- submit_song_for_review: solo editor/admin.
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
-- withdraw_song_from_review: solo editor/admin.
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
