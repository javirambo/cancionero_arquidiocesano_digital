-- =============================================================
-- Migración: 0013_announcements_coordinator
-- CU-21: permitir que coordinator (y editor) gestionen anuncios con
-- alcance parroquial. Solo admin puede crear anuncios globales (sin
-- filas en `announcement_parishes`).
--
-- Cambios:
--   1. Reescribir RLS de `announcements` (FOR ALL) para incluir a
--      coordinator/editor cuando el anuncio tiene al menos una fila
--      en `announcement_parishes` apuntando a una parroquia donde
--      el usuario es coordinator (o si el usuario es editor, a
--      cualquiera de sus parroquias miembros).
--   2. Reescribir RLS de `announcement_parishes` (FOR ALL) para
--      permitir a coordinator/editor agregar/quitar parroquias en
--      las que tienen rol.
--   3. SELECT de `announcements` también debe permitir al admin /
--      coordinator ver TODOS los anuncios suyos sin importar la
--      ventana de vigencia (para el listado admin).
--
-- Reglas de propiedad:
--   - admin: puede TODO (sigue como hoy).
--   - editor: igual que admin (rol elevado).
--   - coordinator: puede gestionar anuncios que tengan AL MENOS UNA
--     fila en announcement_parishes apuntando a una parroquia donde
--     él es coordinator. NO puede crear ni editar anuncios globales
--     (sin filas).
--
-- IMPORTANTE: aplicar después de 0012.
-- =============================================================

-- Helper: el usuario es coordinator de alguna de las parroquias de
-- un anuncio dado.
create or replace function public.is_coordinator_of_announcement(ann_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.announcement_parishes ap
    join public.parish_members pm
      on pm.parish_id = ap.parish_id
    where ap.announcement_id = ann_id
      and pm.user_id = auth.uid()
      and pm.role = 'coordinator'
  );
$$;

grant execute on function public.is_coordinator_of_announcement(uuid)
  to anon, authenticated;

-- ------------------------------------------------------------------
-- 1. RLS de `announcements`
-- ------------------------------------------------------------------

drop policy if exists announcements_select_public on public.announcements;
drop policy if exists announcements_admin_all     on public.announcements;
drop policy if exists announcements_owner_all     on public.announcements;

-- Lectura: pública con ventana de vigencia y filtro de parroquia
-- (igual que antes), y además admin/editor/coordinator-dueño ven sus
-- anuncios sin importar la ventana (para el listado admin).
create policy announcements_select_public
  on public.announcements for select
  using (
    public.is_admin()
    or public.is_editor()
    or public.is_coordinator_of_announcement(id)
    or (
      now() between starts_at and ends_at
      and public.announcement_is_visible_to_user(id)
    )
  );

-- Escritura admin/editor: todo.
create policy announcements_editor_all
  on public.announcements for all
  using (public.is_admin() or public.is_editor())
  with check (public.is_admin() or public.is_editor());

-- Escritura coordinator: solo si el anuncio tiene al menos una
-- parroquia donde es coordinator (NO globales).
create policy announcements_coordinator_all
  on public.announcements for all
  using (public.is_coordinator_of_announcement(id))
  with check (public.is_coordinator_of_announcement(id));

-- ------------------------------------------------------------------
-- 2. RLS de `announcement_parishes`
-- ------------------------------------------------------------------

drop policy if exists announcement_parishes_admin_all on public.announcement_parishes;
drop policy if exists announcement_parishes_editor_all on public.announcement_parishes;
drop policy if exists announcement_parishes_coordinator on public.announcement_parishes;

-- Admin/editor: todo.
create policy announcement_parishes_editor_all
  on public.announcement_parishes for all
  using (public.is_admin() or public.is_editor())
  with check (public.is_admin() or public.is_editor());

-- Coordinator: insertar/borrar filas para parroquias donde es
-- coordinator (es decir, no puede agregar otras parroquias al
-- alcance del anuncio).
create policy announcement_parishes_coordinator
  on public.announcement_parishes for all
  using (public.is_coordinator_of(parish_id))
  with check (public.is_coordinator_of(parish_id));
