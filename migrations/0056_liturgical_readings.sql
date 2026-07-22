-- =====================================================================
-- Cancionero Arquidiocesano Digital — Lecturas del leccionario
-- Migración: 0056_liturgical_readings
-- Referencia: documentacion/modelo_de_datos.md (liturgical_readings)
--             documentacion/calendario-liturgico-y-lecturas.md (§3, §4)
--
-- Decisión: guardar los textos de las lecturas (leccionario) que romcal
-- NO provee. Se obtienen de curas.com.ar mediante un script de ingesta
-- anual e idempotente (scripts/import-lecturas.ts) y se unen al calendario
-- que ya calcula romcal por `event_date`.
--
-- Modelo:
--   - Una fila por (event_date, reading_set). 'principal' = lectura del
--     propio/tiempo/feria (ordo2[6]); 'memoria' = lectura de la memoria
--     opcional (ordo2[5]) cuando el día la ofrece.
--   - source_url + source_hash: trazabilidad y detección de cambios para
--     la re-ingesta idempotente año a año (upsert on conflict).
--
-- Derechos de autor: los textos del leccionario tienen derechos (CEA /
-- Verbo Divino — ver §9 del análisis). Esta tabla los almacena para uso
-- interno; su exposición pública requiere autorización escrita.
--
-- Notas de compatibilidad con migraciones previas:
--   - Reusa el helper public.set_updated_at() (0001) y los helpers de RLS
--     public.is_editor()/public.is_admin() (0002). No los redefine.
--   - No toca ni depende de la tabla liturgical_events (eliminada en 0018).
--     El join es directo por fecha con el calendario de romcal.
-- =====================================================================

create table public.liturgical_readings (
  id              uuid primary key default gen_random_uuid(),

  -- Identidad / join con el calendario de romcal.
  event_date      date not null,
  reading_set     text not null default 'principal'
                  check (reading_set in ('principal','memoria')),

  -- Metadatos del día (del .js del mes).
  celebration     text,
  color           text check (color in ('verde','rojo','blanco','morado','rosa','negro')),

  -- Encabezado del leccionario (del .htm).
  liturgical_time text,
  day_label       text,

  -- Cuerpo de las lecturas (jsonb estructurado: {ref, heading, body};
  -- el salmo usa {ref, response, stanzas[]}).
  first_reading   jsonb,
  psalm           jsonb,
  second_reading  jsonb,
  gospel_accl     jsonb,
  gospel          jsonb,

  -- Trazabilidad / re-scrape.
  source_url      text not null,
  source_hash     text,
  imported_at     timestamptz not null default now(),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (event_date, reading_set)
);

create index liturgical_readings_event_date_idx
  on public.liturgical_readings(event_date);

create trigger liturgical_readings_set_updated_at
  before update on public.liturgical_readings
  for each row execute function public.set_updated_at();

alter table public.liturgical_readings enable row level security;

-- ---------------------------------------------------------------------
-- RLS: lectura pública; escritura solo editor/admin
-- (mismo patrón que song_categories en 0021).
-- ---------------------------------------------------------------------
create policy liturgical_readings_select_public
  on public.liturgical_readings for select
  using (true);

create policy liturgical_readings_write_editors
  on public.liturgical_readings for all
  using (public.is_editor() or public.is_admin())
  with check (public.is_editor() or public.is_admin());
