-- =====================================================================
-- Cancionero Arquidiocesano Digital — Anuncios unificados (CU-07, CU-21)
-- Migración: 0008_announcements_v2
-- Referencia: documentacion/casos_de_uso.md (CU-21 reescrito, CU-07),
--             documentacion/modelo_de_datos.md (announcements,
--             announcement_parishes).
--
-- Cambios:
--   1. Drop tabla `featured_content` (se unifica con `announcements`).
--   2. Drop tabla `announcement_dismissals` (los anuncios no se cierran
--      por usuario; vencen automáticamente al pasar `ends_at`).
--   3. Reescribir `announcements`:
--      - Drop columnas: `scope`, `parish_id`, `is_active`.
--      - `body` pasa a ser opcional.
--      - Add columnas: `target_kind`, `target_id`, `target_url`,
--        `updated_at` + checks.
--   4. Crear tabla `announcement_parishes` (N–N anuncio ↔ parroquia).
--      Sin filas → anuncio global; con filas → dirigido.
--   5. RLS:
--      - Drop policy `announcements_coordinator_parish`
--        (solo admin gestiona).
--      - Reescribir `announcements_select_public` con la nueva regla
--        de visibilidad (anónimo solo globales; autenticado globales +
--        los de sus parish_members) usando una función helper SECURITY
--        DEFINER para evitar bypass por la RLS de
--        `announcement_parishes`.
--      - RLS para `announcement_parishes` (lectura pública, escritura
--        admin).
--   6. Seed de permisos: eliminar `announcement.parish` (no se usa más).
--      `announcement.global` queda definido pero solo lo tiene admin.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Drop tablas viejas
-- ---------------------------------------------------------------------
drop table if exists public.announcement_dismissals;
drop table if exists public.featured_content;

-- ---------------------------------------------------------------------
-- 2. Reescribir announcements
-- ---------------------------------------------------------------------

-- Drop policies viejas para evitar conflictos al alterar columnas.
drop policy if exists announcements_select_public      on public.announcements;
drop policy if exists announcements_admin_all          on public.announcements;
drop policy if exists announcements_coordinator_parish on public.announcements;

-- Drop columnas obsoletas. Postgres dropea automáticamente los CHECKs
-- que dependen de estas columnas (scope-check y scope/parish_id-check).
-- El índice announcements_parish_id_idx también se dropea con la columna.
alter table public.announcements
  drop column if exists scope,
  drop column if exists parish_id,
  drop column if exists is_active;

-- body pasa a ser opcional.
alter table public.announcements
  alter column body drop not null;

-- Nuevas columnas para "atajo" del banner.
alter table public.announcements
  add column if not exists target_kind text  not null default 'none'
    check (target_kind in ('song','playlist','parish','external','none')),
  add column if not exists target_id   uuid,
  add column if not exists target_url  text,
  add column if not exists updated_at  timestamptz not null default now();

-- Coherencia entre target_kind y target_id/target_url.
alter table public.announcements
  add constraint announcements_target_consistency_check
  check (
    (target_kind = 'external' and target_url is not null)
    or (target_kind in ('song','playlist','parish') and target_id is not null)
    or (target_kind = 'none')
  );

-- Trigger updated_at (la función set_updated_at() ya existe en 0001).
drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. announcement_parishes (N–N)
-- ---------------------------------------------------------------------
create table if not exists public.announcement_parishes (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  parish_id       uuid not null references public.parishes(id)      on delete cascade,
  primary key (announcement_id, parish_id)
);

create index if not exists announcement_parishes_parish_idx
  on public.announcement_parishes(parish_id);

alter table public.announcement_parishes enable row level security;

-- ---------------------------------------------------------------------
-- 4. Helper de visibilidad (SECURITY DEFINER para que la subconsulta
--    sobre announcement_parishes no quede tapada por la RLS de esa
--    tabla cuando se llame desde la policy SELECT de announcements).
-- ---------------------------------------------------------------------
create or replace function public.announcement_is_visible_to_user(ann_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (
      select 1
      from public.announcement_parishes ap
      where ap.announcement_id = ann_id
    )
    or (
      auth.uid() is not null
      and exists (
        select 1
        from public.announcement_parishes ap
        join public.parish_members pm on pm.parish_id = ap.parish_id
        where ap.announcement_id = ann_id
          and pm.user_id = auth.uid()
      )
    );
$$;

grant execute on function public.announcement_is_visible_to_user(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. RLS: announcements
-- ---------------------------------------------------------------------

-- Lectura pública con ventana de vigencia y filtro de parroquia.
create policy announcements_select_public
  on public.announcements for select
  using (
    public.is_admin()
    or (
      now() between starts_at and ends_at
      and public.announcement_is_visible_to_user(id)
    )
  );

-- Escritura: solo admin.
create policy announcements_admin_all
  on public.announcements for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 6. RLS: announcement_parishes
--    Lectura pública (la información de a qué parroquia va dirigido un
--    anuncio no es sensible; el contenido del anuncio sigue filtrado
--    por la policy de `announcements`). Escritura: solo admin.
-- ---------------------------------------------------------------------
create policy announcement_parishes_select_public
  on public.announcement_parishes for select
  using (true);

create policy announcement_parishes_admin_all
  on public.announcement_parishes for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 7. Permisos: eliminar `announcement.parish` (sin uso en el nuevo
--    modelo). Las filas de role_permissions referenciadas caen por
--    ON DELETE CASCADE. `announcement.global` se mantiene.
-- ---------------------------------------------------------------------
delete from public.permissions where code = 'announcement.parish';
