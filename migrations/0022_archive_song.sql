-- =====================================================================
-- Cancionero Arquidiocesano Digital — Archivado de canciones
-- Migración: 0022_archive_song
--
-- Contexto:
--   El estado `archived` ya existía en `songs.status` (CHECK desde mig.
--   0001) pero no había forma de llegar a él desde la app: no existían
--   RPCs ni acciones UI. Quedaba como feature documentada pero ociosa.
--
--   Esta migración cubre el gap: dos RPCs simétricas — `archive_song`
--   para la baja lógica y `unarchive_song` para revertirla.
--
-- Diseño:
--   - archive_song(p_song_id):
--       * Permitido para Editor y Admin (mismo criterio que `unpublish_song`).
--       * Permitido desde cualquier estado excepto `archived`.
--       * Limpia campos de flujo (`submitted_*`, `reviewed_*`, `published_at`,
--         `review_notes`) para evitar dejar trazas inconsistentes — la
--         canción puede volver a circular si se desarchiva, y `song_versions`
--         conserva el historial publicado intacto.
--   - unarchive_song(p_song_id):
--       * Editor o Admin.
--       * Solo desde `archived`. La devuelve a `draft` para que pase
--         nuevamente por el flujo de revisión si quiere republicarse.
--
--   No se tocan `song_files` (mismo patrón que `unpublish_song` post-0017,
--   donde song_files dejó de tener `status` propio).
-- =====================================================================

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

create or replace function public.unarchive_song(p_song_id uuid)
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
  if v_status <> 'archived' then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status = 'draft'
   where id = p_song_id;
end;
$$;

grant execute on function public.unarchive_song(uuid) to authenticated;
