-- =====================================================================
-- Cancionero Arquidiocesano Digital — Lecturas: flag de bloqueo manual
-- Migración: 0057_liturgical_readings_locked
-- Referencia: documentacion/calendario-liturgico-y-lecturas.md (§1, §5)
--             documentacion/modelo_de_datos.md (liturgical_readings)
--
-- Decisión: habilitar la edición manual de lecturas (CRUD de admin) sin
-- que la re-ingesta anual desde curas.com.ar pise esas correcciones.
--
-- Cambios:
--   1. Agregar liturgical_readings.locked (boolean, default false).
--
-- Semántica:
--   - locked = true  ⇒ fila editada/curada a mano. El script de ingesta
--     (scripts/import-lecturas.ts) la EXCLUYE del upsert, así no la
--     sobreescribe. El admin puede volver a poner locked = false para que
--     la próxima ingesta la retome desde la fuente.
--   - locked = false ⇒ fila importada; la ingesta la actualiza normalmente.
--
-- Notas:
--   - RLS y trigger se heredan de 0056 (no se tocan): select público,
--     escritura solo is_editor()/is_admin().
--   - Las filas existentes quedan en false (default), que es el
--     comportamiento previo (todas importadas).
-- =====================================================================

alter table public.liturgical_readings
  add column locked boolean not null default false;

comment on column public.liturgical_readings.locked is
  'true = editada a mano; la ingesta anual no la sobreescribe (ver import-lecturas.ts).';
