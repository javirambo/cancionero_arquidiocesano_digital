-- ---------------------------------------------------------------------
-- Migración: 0043_fix_submit_song_for_review_drop_song_files_update
-- ---------------------------------------------------------------------
-- Contexto:
--   La migración 0017 (`song_files_remove_status`) eliminó las columnas
--   editoriales de `song_files` (status, submitted_by, submitted_at,
--   reviewed_by, reviewed_at, review_notes, published_at) y dejó
--   `submit_song_for_review` limpia, sin tocar `song_files`.
--
--   Sin embargo, la migración 0037 (`restrict_songs_to_editors`)
--   reintrodujo por error un `update public.song_files set status =
--   'review' ... where status = 'draft'` dentro de
--   `submit_song_for_review`. Como esa columna ya no existe, la RPC
--   falla con 400 cada vez que un editor/admin intenta enviar una
--   canción a revisión.
--
-- Cambio:
--   `create or replace function public.submit_song_for_review` con la
--   misma lógica de 0037 (solo editor/admin pueden invocarla,
--   transición permitida desde draft/rejected) pero sin el update a
--   `song_files`.
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
end;
$$;

grant execute on function public.submit_song_for_review(uuid) to authenticated;
