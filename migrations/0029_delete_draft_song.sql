-- =====================================================================
-- Cancionero Arquidiocesano Digital — Borrado de canción "draft virgen"
-- Migración: 0029_delete_draft_song
--
-- Contexto:
--   Al crear canciones desde "+ Nueva" pueden quedar registros vacíos si
--   el usuario abandona el alta (la RPC create_blank_song ya inserta la
--   fila con number asignado). Hasta ahora la única forma de sacarlas
--   era `archive_song`, pero archivar igual conserva la fila y el
--   número. Pedido: poder *borrar* canciones que nunca salieron del
--   estado inicial.
--
-- Diseño:
--   - delete_draft_song(p_song_id uuid) returns void.
--   - Permitido para Editor y Admin (mismo criterio que archive_song /
--     unpublish_song).
--   - Condición "estricta": status = 'draft' AND no existe ninguna fila
--     en song_versions para esa canción. Una canción que pasó alguna vez
--     a 'review' (o más adelante) tiene un snapshot persistido en
--     song_versions (mig. 0015), aún si después fue devuelta a draft con
--     withdraw/unpublish. Por eso `song_versions` es el "historial
--     efectivo" en ausencia de una tabla de auditoría dedicada.
--   - Borra atómicamente:
--       * archivos de storage referenciados desde song_files,
--       * filas de song_files (igual cae por on delete cascade, pero
--         lo hacemos explícito para poder leer bucket/path antes),
--       * la fila de songs (cascadea: song_categories, favorites,
--         user_song_keys, playlist_songs, etc.).
--   - El número queda "perdido" intencionalmente: igual que con archive,
--     no se reusan huecos.
-- =====================================================================

create or replace function public.delete_draft_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_status  text;
  v_versions int;
  r record;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select status into v_status
    from public.songs
   where id = p_song_id
   for update;
  if v_status is null then
    raise exception 'song not found' using errcode = 'P0002';
  end if;
  if v_status <> 'draft' then
    raise exception 'only draft songs can be deleted (got %)', v_status
      using errcode = 'P0001';
  end if;

  select count(*) into v_versions
    from public.song_versions
   where song_id = p_song_id;
  if v_versions > 0 then
    raise exception 'song has version history, cannot delete'
      using errcode = 'P0001';
  end if;

  -- Limpiar objetos de storage antes de borrar las filas.
  for r in
    select bucket, path from public.song_files where song_id = p_song_id
  loop
    delete from storage.objects
     where bucket_id = r.bucket
       and name      = r.path;
  end loop;

  delete from public.songs where id = p_song_id;
end;
$$;

grant execute on function public.delete_draft_song(uuid) to authenticated;
