-- =====================================================================
-- Cancionero Arquidiocesano Digital — Creador de playlist personal
-- Migración: 0054_get_playlist_creator
--
-- Contexto:
--   La página /playlists/{id} muestra, debajo del título, el nombre del
--   usuario que creó la lista cuando es una playlist PERSONAL
--   (parish_id IS NULL) y el creador no es el usuario logueado (CU-17).
--
--   La tabla public.users tiene RLS restrictiva (users_select_self, mig.
--   0002): cada usuario solo lee su propio perfil, por lo que un visitante
--   o cualquier usuario que no sea el dueño no puede leer el display_name
--   del creador con una consulta directa.
--
--   Esta migración agrega get_playlist_creator(p_playlist_id uuid),
--   análoga a get_parish_coordinators (mig. 0026/0027): security definer,
--   acotada a playlists personales, devuelve (created_by, display_name).
--   grant a anon y authenticated.
-- =====================================================================

create or replace function public.get_playlist_creator(
  p_playlist_id uuid
)
returns table (
  created_by   uuid,
  display_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.created_by, u.display_name
  from public.playlists p
  left join public.users u on u.id = p.created_by
  where p.id = p_playlist_id
    and p.parish_id is null;
$$;

revoke all on function public.get_playlist_creator(uuid) from public;
grant execute on function public.get_playlist_creator(uuid) to anon, authenticated;
