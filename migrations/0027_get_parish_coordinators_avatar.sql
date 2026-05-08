-- =====================================================================
-- Cancionero Arquidiocesano Digital — Avatar en coordinadores de parroquia
-- Migración: 0027_get_parish_coordinators_avatar
--
-- Contexto:
--   La 0026 introdujo get_parish_coordinators(p_parish_id) devolviendo
--   user_id, display_name y email. Para la sección "Contacto" en la vista
--   pública de parroquia queremos también mostrar la foto del usuario
--   (la que Supabase guarda en public.users.avatar_url cuando el usuario
--   ingresa con Google OAuth).
--
-- Diseño:
--   - Cambiar la firma agrega una columna al RETURNS TABLE, lo cual
--     PostgreSQL no permite con `create or replace`. Por eso hacemos
--     drop + create. Mantenemos el resto idéntico a la 0026 (security
--     definer, search_path, stable, grants a anon y authenticated).
-- =====================================================================

drop function if exists public.get_parish_coordinators(uuid);

create function public.get_parish_coordinators(
  p_parish_id uuid
)
returns table (
  user_id      uuid,
  display_name text,
  email        text,
  avatar_url   text
)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.display_name, u.email, u.avatar_url
  from public.parish_members pm
  join public.users u on u.id = pm.user_id
  where pm.parish_id = p_parish_id
    and pm.role = 'coordinator'
  order by coalesce(u.display_name, u.email);
$$;

revoke all on function public.get_parish_coordinators(uuid) from public;
grant execute on function public.get_parish_coordinators(uuid) to anon, authenticated;
