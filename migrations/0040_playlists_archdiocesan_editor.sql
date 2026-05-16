-- =====================================================================
-- Cancionero Arquidiocesano Digital — Editor gestiona playlists de
-- la parroquia virtual `arquidiocesis` + validación de `is_archdiocesan`.
-- Migración: 0040_playlists_archdiocesan_editor
--
-- Contexto (decisión 2026-05-16):
--   - El rol `editor` debe poder crear/editar/borrar playlists cuya
--     `parish_id` sea la parroquia virtual `arquidiocesis`, sin
--     necesidad de figurar en `parish_members` de esa parroquia.
--     (Decidimos NO usar trigger sobre user_roles para no mantener
--     filas auto-managed en parish_members. La RLS resuelve directo.)
--   - El flag `is_archdiocesan = true` solo puede setearlo el editor
--     (`is_editor()` incluye admin), y SOLO sobre playlists cuya
--     `parish_id` sea la de `arquidiocesis`. Se valida con trigger
--     BEFORE INSERT/UPDATE para devolver un mensaje claro.
--
-- Cambios:
--   1. Reemplazar policies playlists_insert / playlists_update /
--      playlists_delete (mig. 0009) agregando la rama
--      "(is_editor() AND parish_id = id_de_arquidiocesis)".
--   2. Trigger BEFORE INSERT/UPDATE en playlists que valida
--      is_archdiocesan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. RLS de playlists (INSERT/UPDATE/DELETE): permitir al editor
--    operar sobre playlists de la parroquia virtual arquidiocesis.
-- ---------------------------------------------------------------------
drop policy if exists playlists_insert on public.playlists;
create policy playlists_insert
  on public.playlists for insert
  with check (
    public.is_admin()
    or (public.is_coordinator_of(parish_id) and created_by = auth.uid())
    or (parish_id is null and created_by = auth.uid())
    or (
      public.is_editor()
      and parish_id = (select id from public.parishes where slug = 'arquidiocesis')
    )
  );

drop policy if exists playlists_update on public.playlists;
create policy playlists_update
  on public.playlists for update
  using (
    public.is_admin()
    or public.is_coordinator_of(parish_id)
    or (parish_id is null and created_by = auth.uid())
    or (
      public.is_editor()
      and parish_id = (select id from public.parishes where slug = 'arquidiocesis')
    )
  )
  with check (
    public.is_admin()
    or public.is_coordinator_of(parish_id)
    or (parish_id is null and created_by = auth.uid())
    or (
      public.is_editor()
      and parish_id = (select id from public.parishes where slug = 'arquidiocesis')
    )
  );

drop policy if exists playlists_delete on public.playlists;
create policy playlists_delete
  on public.playlists for delete
  using (
    public.is_admin()
    or public.is_coordinator_of(parish_id)
    or (parish_id is null and created_by = auth.uid())
    or (
      public.is_editor()
      and parish_id = (select id from public.parishes where slug = 'arquidiocesis')
    )
  );

-- ---------------------------------------------------------------------
-- 2. Trigger BEFORE INSERT/UPDATE: validar is_archdiocesan.
--    Reglas:
--      - is_archdiocesan = true requiere is_editor() (editor o admin).
--      - is_archdiocesan = true requiere parish_id = id de arquidiocesis.
--    Si alguna falla → RAISE EXCEPTION con mensaje claro.
-- ---------------------------------------------------------------------
create or replace function public.enforce_archdiocesan_playlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_arch_id uuid;
begin
  if not coalesce(new.is_archdiocesan, false) then
    return new;
  end if;

  select id into v_arch_id from public.parishes where slug = 'arquidiocesis';

  if v_arch_id is null then
    raise exception 'No existe la parroquia virtual ''arquidiocesis''.'
      using errcode = 'P0001';
  end if;

  if new.parish_id is distinct from v_arch_id then
    raise exception 'Solo se puede marcar is_archdiocesan en playlists de la parroquia ''arquidiocesis''.'
      using errcode = '42501';
  end if;

  if not public.is_editor() then
    raise exception 'Solo el rol editor (o admin) puede marcar una playlist como arquidiocesana.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists playlists_archdiocesan_check on public.playlists;
create trigger playlists_archdiocesan_check
  before insert or update on public.playlists
  for each row
  execute function public.enforce_archdiocesan_playlist();
