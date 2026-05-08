-- =====================================================================
-- Cancionero Arquidiocesano Digital — Coordinadores de una parroquia
-- Migración: 0026_get_parish_coordinators
--
-- Contexto:
--   La vista pública de parroquia (/parroquias/[slug]) muestra una sección
--   "Contacto" con los coordinadores de esa parroquia (nombre + email),
--   visible para todos los visitantes (incluso anónimos).
--
--   La tabla public.users tiene RLS restrictiva: cada usuario solo lee su
--   propio perfil (y los admins leen todo). Por eso no se puede consultar
--   directo desde un visitante anónimo.
--
-- Diseño:
--   - Función get_parish_coordinators(p_parish_id uuid) con security
--     definer, que devuelve nombre y email de los miembros con
--     role = 'coordinator' de esa parroquia.
--   - Solo expone los campos necesarios (no abre la tabla users).
--   - GRANT EXECUTE a anon y authenticated para visibilidad pública.
--   - REVOKE de PUBLIC al inicio como buena práctica con security definer.
-- =====================================================================

create or replace function public.get_parish_coordinators(
  p_parish_id uuid
)
returns table (
  user_id      uuid,
  display_name text,
  email        text
)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.display_name, u.email
  from public.parish_members pm
  join public.users u on u.id = pm.user_id
  where pm.parish_id = p_parish_id
    and pm.role = 'coordinator'
  order by coalesce(u.display_name, u.email);
$$;

revoke all on function public.get_parish_coordinators(uuid) from public;
grant execute on function public.get_parish_coordinators(uuid) to anon, authenticated;
