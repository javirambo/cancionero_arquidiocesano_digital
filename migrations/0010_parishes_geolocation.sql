-- =============================================================
-- Migración: 0010_parishes_geolocation
-- Agrega coordenadas geográficas a `parishes` para ordenar el
-- listado por cercanía al usuario en `/parroquias` (CU-19).
--
-- Cambios:
--   1. `parishes.latitude`  numeric(9,6) NULL
--   2. `parishes.longitude` numeric(9,6) NULL
--
-- Las parroquias existentes quedan con NULL hasta el backfill
-- (un script externo, ver Pendientes.md).
--
-- IMPORTANTE: aplicar después de 0009.
-- =============================================================

alter table public.parishes
  add column latitude  numeric(9,6),
  add column longitude numeric(9,6);
