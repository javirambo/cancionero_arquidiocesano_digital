-- =====================================================================
-- Cancionero Arquidiocesano Digital — Visibilidad abierta para invitados
-- Migración: 0035_open_visibility
-- Referencia: documentacion/casos_de_uso.md (CU lectura pública).
--
-- Cambios:
--   1. parishes: lectura totalmente pública (incluso is_active = false).
--      Antes: `is_active or is_editor()`.
--   2. announcements: `announcement_is_visible_to_user` ahora devuelve
--      siempre true. Cualquier invitado ve todos los anuncios; la
--      vigencia se sigue evaluando client-side con entity_schedules.
--   3. playlists: sin cambios. La policy actual ya permite a invitados
--      ver public/unlisted/archdiocesan y oculta las private (que es
--      la regla deseada).
--   4. songs: sin cambios. Se mantiene la regla actual de mostrar solo
--      status='published' para no editores.
-- =====================================================================

-- 1. Parroquias: lectura abierta (incluso inactivas).
drop policy if exists parishes_select_public on public.parishes;
create policy parishes_select_public
  on public.parishes for select
  using (true);

-- 2. Anuncios: hacer que la función de visibilidad por parroquia
--    devuelva siempre true (todos los usuarios, incluso invitados, ven
--    todos los anuncios). Mantenemos la función para no romper policies
--    que la referencian (announcements_select_public en 0018,
--    announcement_documents_select en 0034).
create or replace function public.announcement_is_visible_to_user(ann_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select true;
$$;

grant execute on function public.announcement_is_visible_to_user(uuid)
  to anon, authenticated;
