-- =============================================================
-- Migración: 0012_parishes_insert_pending
-- Permite que cualquier usuario autenticado (member/coordinator/
-- editor) cree una parroquia, pero solo en estado 'pending'.
-- El admin sigue pudiendo crear en cualquier estado vía la política
-- `parishes_admin_all` (FOR ALL) ya existente.
--
-- IMPORTANTE: aplicar después de 0011.
-- =============================================================

drop policy if exists parishes_insert_self_pending on public.parishes;
create policy parishes_insert_self_pending
  on public.parishes for insert
  to authenticated
  with check (status = 'pending');
