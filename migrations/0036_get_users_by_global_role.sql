-- =====================================================================
-- Cancionero Arquidiocesano Digital — Usuarios por rol global
-- Migración: 0036_get_users_by_global_role
--
-- Contexto:
--   La página pública /parroquias/{slug} muestra la sección "Contacto"
--   con distinto destinatario según el rol del visitante (CU-06.2):
--     - Visitante / member: coordinadores de la parroquia
--       (ya cubierto por get_parish_coordinators, mig. 0026/0027).
--     - Coordinator de la parroquia: editores y admins globales.
--     - Editor: admins globales.
--     - Admin: no aplica (no se muestra).
--
--   Esta migración agrega get_users_by_global_role(p_role text), análoga
--   a get_parish_coordinators pero filtrando por nombre de rol global
--   (tabla roles + user_roles). Devuelve (user_id, display_name, email,
--   avatar_url). security definer + grant a anon y authenticated.
-- =====================================================================

create or replace function public.get_users_by_global_role(
  p_role text
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
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  join public.users u on u.id = ur.user_id
  where r.name = p_role
    and u.is_active
  order by coalesce(u.display_name, u.email);
$$;

revoke all on function public.get_users_by_global_role(text) from public;
grant execute on function public.get_users_by_global_role(text) to anon, authenticated;
