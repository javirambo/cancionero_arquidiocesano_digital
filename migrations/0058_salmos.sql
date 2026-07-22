-- =====================================================================
-- Cancionero Arquidiocesano Digital — Salmos responsoriales (media reusable)
-- Migración: 0058_salmos
-- Referencia: documentacion/calendario-liturgico-y-lecturas.md
--             documentacion/modelo_de_datos.md (salmos, liturgical_readings.salmo_id)
--
-- Decisión: normalizar la media del salmo (audio cantado + partitura) en una
-- tabla propia. El mismo salmo responsorial se repite en muchas fechas; tener
-- la media en `liturgical_readings.psalm.files` obligaba a duplicarla y la
-- ingesta anual de curas la pisaba. Ahora vive una sola vez en `salmos` y las
-- fechas la referencian por `salmo_id` → editar el audio/partitura una vez
-- impacta en todas las fechas, y el re-import ya no la toca.
--
-- Identidad de un salmo: (psalm_number, response_norm) — número de salmo +
-- antífona normalizada (sin tildes/puntuación). `source_slug` es el id del
-- catálogo del Coro San Clemente (fuente de la carga masiva inicial).
--
-- Notas:
--   - El TEXTO del salmo (ref/response/stanzas) sigue en liturgical_readings.psalm
--     (fuente curas / Libro del Pueblo de Dios). `salmos` aporta SOLO la media.
--   - Reusa set_updated_at() (0001) y is_editor()/is_admin() (0002).
--   - RLS: lectura pública; escritura solo editor/admin (patrón song_categories).
-- =====================================================================

create table public.salmos (
  id             uuid primary key default gen_random_uuid(),
  psalm_number   int  not null,                       -- 1..150
  ref            text,                                 -- "Sal 1, 1-4.6" (del detalle; nullable)
  response       text not null,                        -- antífona (label del CRUD)
  response_norm  text not null,                        -- normalizada → match + unique
  source         text not null default 'coro_san_clemente'
                 check (source in ('coro_san_clemente','manual')),
  source_slug    text unique,                          -- "SR_1_El_que_sigue_al_Sr" (catálogo)
  audio_path     text,                                 -- bucket images, carpeta salmos/ (nullable)
  score_path     text,                                 -- idem partitura (nullable)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (psalm_number, response_norm)
);

create index salmos_psalm_number_idx on public.salmos(psalm_number);

create trigger salmos_set_updated_at
  before update on public.salmos
  for each row execute function public.set_updated_at();

alter table public.salmos enable row level security;

create policy salmos_select_public
  on public.salmos for select
  using (true);

create policy salmos_write_editors
  on public.salmos for all
  using (public.is_editor() or public.is_admin())
  with check (public.is_editor() or public.is_admin());

-- ---------------------------------------------------------------------
-- Vínculo fecha → salmo. Nullable: no toda fecha tiene un salmo del catálogo
-- (cánticos "Lc 1, 46-55", antífonas sin match). Se setea por match automático
-- (nº + antífona normalizada) y/o a mano desde el CRUD de lecturas.
-- ---------------------------------------------------------------------
alter table public.liturgical_readings
  add column salmo_id uuid references public.salmos(id) on delete set null;

create index liturgical_readings_salmo_id_idx
  on public.liturgical_readings(salmo_id);
