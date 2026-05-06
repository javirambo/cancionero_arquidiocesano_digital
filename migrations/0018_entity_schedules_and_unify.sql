-- =====================================================================
-- Cancionero Arquidiocesano Digital — Vigencia temporal genérica
-- Migración: 0018_entity_schedules_and_unify
-- Referencia: documentacion/modelo_de_datos.md, documentacion/casos_de_uso.md
--             (CU-05, CU-07, CU-17, CU-21).
--
-- Objetivos:
--   1. Crear `entity_schedules`: tabla genérica de vigencia temporal
--      (calendario + horario, zona AR), polimórfica por (entity_type,
--      entity_id), sin FKs.
--   2. Eliminar `playlists.event_date` (la vigencia pasa a vivir en
--      `entity_schedules`).
--   3. Eliminar `announcements.starts_at` y `announcements.ends_at`,
--      reemplazadas por `entity_schedules`. Agregar `announcements.kind`
--      para distinguir festividades litúrgicas de anuncios comunes.
--   4. Eliminar la tabla `liturgical_events`: sus festividades pasan a
--      ser anuncios con `kind in ('solemnidad','fiesta','memoria',
--      'tiempo','otro')`.
--
-- IMPORTANTE: ambiente de desarrollo. Esta migración TRUNCA datos
-- existentes en playlists, announcements y liturgical_events para
-- arrancar limpio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. TRUNCATE de tablas afectadas (dev-only)
--    cascade arrastra: playlist_songs, playlist_parish_subscriptions,
--    announcement_parishes, favorites de playlists/etc.
-- ---------------------------------------------------------------------
truncate table
  public.playlists,
  public.announcements,
  public.liturgical_events
cascade;

-- Favoritos huérfanos de playlists borradas (la integridad polimórfica
-- es por trigger, no por FK, así que el truncate de playlists no los
-- arrastra).
delete from public.favorites where target_kind = 'playlist';

-- ---------------------------------------------------------------------
-- 1. Drop liturgical_events
-- ---------------------------------------------------------------------
drop table if exists public.liturgical_events;

-- ---------------------------------------------------------------------
-- 2. playlists: drop event_date
-- ---------------------------------------------------------------------
drop index if exists public.playlists_event_date_idx;
alter table public.playlists drop column if exists event_date;

-- ---------------------------------------------------------------------
-- 3. announcements: drop ventana, drop policy que la usaba, agregar kind
-- ---------------------------------------------------------------------
-- Primero drop policies que dependen de starts_at/ends_at.
drop policy if exists announcements_select_public on public.announcements;

-- Drop window-related index y columnas.
drop index if exists public.announcements_window_idx;
alter table public.announcements
  drop constraint if exists announcements_check,            -- check ends_at > starts_at
  drop constraint if exists announcements_starts_at_check;
alter table public.announcements
  drop column if exists starts_at,
  drop column if exists ends_at;

-- Nueva columna kind (null = anuncio común; valor = festividad litúrgica).
alter table public.announcements
  add column if not exists kind text
    check (kind in ('solemnidad','fiesta','memoria','tiempo','otro'));

-- Recrear policy de SELECT sin la condición de ventana
-- (la vigencia ahora se evalúa client-side con entity_schedules).
-- Mantenemos: admin/editor/coordinator-dueño ven todo; resto ve los
-- visibles según announcement_is_visible_to_user (alcance parroquia).
create policy announcements_select_public
  on public.announcements for select
  using (
    public.is_admin()
    or public.is_editor()
    or public.is_coordinator_of_announcement(id)
    or public.announcement_is_visible_to_user(id)
  );

-- ---------------------------------------------------------------------
-- 4. entity_schedules
-- ---------------------------------------------------------------------
create table public.entity_schedules (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('playlist','announcement')),
  entity_id   uuid not null,

  -- Modo calendario.
  date_mode   text not null default 'always'
              check (date_mode in ('always','weekdays','date_range')),
  -- weekdays: 0=domingo … 6=sábado (compatible con extract(dow)).
  weekdays    smallint[],
  start_date  date,
  end_date    date,

  -- Modo horario.
  time_mode   text not null default 'all_day'
              check (time_mode in ('all_day','range')),
  start_time  time,
  end_time    time,

  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Coherencia: campos requeridos según modo.
  constraint entity_schedules_date_mode_consistency
    check (
      (date_mode = 'always'
        and weekdays is null and start_date is null and end_date is null)
      or
      (date_mode = 'weekdays'
        and weekdays is not null
        and array_length(weekdays, 1) >= 1
        and start_date is null and end_date is null)
      or
      (date_mode = 'date_range'
        and weekdays is null
        and start_date is not null)
    ),
  constraint entity_schedules_time_mode_consistency
    check (
      (time_mode = 'all_day' and start_time is null and end_time is null)
      or
      (time_mode = 'range'   and start_time is not null and end_time is not null)
    ),
  constraint entity_schedules_date_range_order
    check (end_date is null or start_date is null or end_date >= start_date),
  constraint entity_schedules_weekdays_valid
    check (
      weekdays is null
      or (
        coalesce(array_length(weekdays, 1), 0) > 0
        and weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
      )
    )
);

create index entity_schedules_lookup_idx
  on public.entity_schedules(entity_type, entity_id);

create trigger entity_schedules_set_updated_at
  before update on public.entity_schedules
  for each row execute function public.set_updated_at();

alter table public.entity_schedules enable row level security;

-- ---------------------------------------------------------------------
-- 5. RLS de entity_schedules
--    SELECT: público (los listados públicos consultan estos schedules
--    para filtrar visibilidad).
--    ESCRITURA:
--      - admin / editor: todo.
--      - coordinator: para playlist suya o anuncio del cual es
--        coordinator (replica patrón 0013_announcements_coordinator).
-- ---------------------------------------------------------------------

-- Helper: el usuario es coordinator del entity (playlist o announcement)
-- referenciado por el schedule.
create or replace function public.is_coordinator_of_schedule_target(
  p_entity_type text, p_entity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_entity_type
    when 'playlist' then exists (
      select 1
      from public.playlists pl
      join public.parish_members pm on pm.parish_id = pl.parish_id
      where pl.id = p_entity_id
        and pm.user_id = auth.uid()
        and pm.role = 'coordinator'
    )
    when 'announcement' then public.is_coordinator_of_announcement(p_entity_id)
    else false
  end;
$$;

grant execute on function public.is_coordinator_of_schedule_target(text, uuid)
  to anon, authenticated;

create policy entity_schedules_select_public
  on public.entity_schedules for select
  using (true);

create policy entity_schedules_editor_all
  on public.entity_schedules for all
  using (public.is_admin() or public.is_editor())
  with check (public.is_admin() or public.is_editor());

create policy entity_schedules_coordinator_all
  on public.entity_schedules for all
  using (public.is_coordinator_of_schedule_target(entity_type, entity_id))
  with check (public.is_coordinator_of_schedule_target(entity_type, entity_id));
