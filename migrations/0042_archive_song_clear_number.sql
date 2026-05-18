-- ---------------------------------------------------------------------
-- Migración: 0042_archive_song_clear_number
-- ---------------------------------------------------------------------
-- Contexto:
--   Hasta 0022 `archive_song` conservaba el campo `number` en la fila
--   archivada. Como `songs_number_unique` (0001) es un índice único
--   parcial sobre `number where number is not null`, ese número quedaba
--   reservado para siempre y no podía reutilizarse en otra canción.
--
-- Cambio:
--   `archive_song` ahora libera el número (`number = null`) al archivar.
--   El resto del comportamiento queda igual que en 0022. Si la canción
--   se recupera (`unarchive_song`), vuelve a `draft` sin número y habrá
--   que asignarle uno nuevo si se quiere publicar.
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
         published_at = null,
         review_notes = null
   where id = p_song_id;
end;
$$;

grant execute on function public.archive_song(uuid) to authenticated;
