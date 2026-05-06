-- =====================================================================
-- Cancionero Arquidiocesano Digital — Quitar 'otro' de announcements.kind
-- Migración: 0019_announcements_kind_drop_otro
-- Referencia: documentacion/modelo_de_datos.md (announcements.kind),
--             documentacion/casos_de_uso.md (CU-21).
--
-- Cambios:
--   1. Pasar a NULL los anuncios con kind='otro' (si los hubiera).
--   2. Reemplazar el CHECK de announcements.kind para aceptar solo
--      ('solemnidad','fiesta','memoria','tiempo'). NULL sigue siendo
--      válido y representa "anuncio común".
-- =====================================================================

update public.announcements set kind = null where kind = 'otro';

alter table public.announcements drop constraint announcements_kind_check;

alter table public.announcements add constraint announcements_kind_check
  check (kind in ('solemnidad','fiesta','memoria','tiempo'));
