-- =====================================================================
-- Cancionero Arquidiocesano Digital — Registrar edición de canción no publicada
-- Migración: 0046_log_song_edit
-- =====================================================================
--
-- Contexto:
--   La migración 0045 registra un evento 'edited' (con snapshot de
--   versión) al guardar una canción en estado 'published'. Pero las
--   ediciones directas sobre canciones en 'draft', 'rejected' o
--   'archived' no quedaban registradas: el contenido se guardaba en
--   `songs` sin dejar rastro en la bitácora.
--
-- Cambio:
--   RPC `log_song_edit(uuid)` — registra un evento 'edited' SIN crear
--   versión en `song_versions`. Una versión solo tiene sentido como
--   snapshot publicado; en estados no publicados el contenido sigue
--   siendo mutable, por eso únicamente se deja el evento en la bitácora.
--   El resumen se autogenera con `build_change_summary` (compara contra
--   la última versión publicada, si existe).
-- =====================================================================

begin;

create or replace function public.log_song_edit(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status  text;
  v_summary text;
begin
  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select status into v_status from public.songs where id = p_song_id;
  if v_status is null then
    raise exception 'song not found' using errcode = 'P0002';
  end if;

  v_summary := public.build_change_summary(p_song_id);

  perform public.log_song_event(p_song_id, 'edited', null, v_summary);
end;
$$;

grant execute on function public.log_song_edit(uuid) to authenticated;

commit;
