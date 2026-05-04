-- =============================================================
-- Migración: 0016_song_unpublish
-- CU-16 (extensión): permitir al Editor/Admin volver una canción
-- publicada al estado `draft` para corregir errores detectados
-- después de la publicación.
--
-- Mantiene `song_versions` intacto (historial preservado) y deja
-- `current_version` como está; cuando la canción se vuelva a
-- aprobar, `approve_song` incrementará la versión normalmente.
--
-- IMPORTANTE: aplicar después de 0015.
-- =============================================================

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
         published_at = null,
         review_notes = null
   where id = p_song_id;

  update public.song_files
     set status       = 'draft',
         submitted_by = null,
         submitted_at = null,
         reviewed_by  = null,
         reviewed_at  = null,
         published_at = null
   where song_id = p_song_id
     and status  = 'published';
end;
$$;

grant execute on function public.unpublish_song(uuid) to authenticated;
