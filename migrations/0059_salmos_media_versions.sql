-- =====================================================================
-- Cancionero Arquidiocesano Digital — Salmos: varios audios + partituras
-- Migración: 0059_salmos_media_versions
-- Referencia: documentacion/calendario-liturgico-y-lecturas.md
--
-- Decisión: un salmo (antífona) puede tener VARIAS versiones de audio
-- (mp3) y VARIAS partituras (partitura simple / melodía y partitura SATB
-- coral). El modelo anterior (audio_path/score_path únicos, mig. 0058) no
-- lo contemplaba. Se reemplazan por dos listas jsonb separadas.
--
-- Cambios:
--   1. Agregar salmos.audios jsonb  = [{ label, path }, …]  (versiones mp3)
--   2. Agregar salmos.scores jsonb  = [{ label, path }, …]  (Simple / SATB)
--   3. Migrar audio_path/score_path a esas listas y eliminarlos.
--
-- Notas:
--   - `path` apunta al bucket `images`, carpeta `salmos/`.
--   - `label` es texto libre ("Versión 1/2…", "Simple", "SATB").
--   - El re-import (scripts/import-salmos-coro.ts) repuebla estas listas
--     agrupando las versiones del catálogo del coro.
-- =====================================================================

alter table public.salmos add column audios jsonb not null default '[]'::jsonb;
alter table public.salmos add column scores jsonb not null default '[]'::jsonb;

update public.salmos
set audios = case
      when audio_path is not null
      then jsonb_build_array(jsonb_build_object('label', 'Versión 1', 'path', audio_path))
      else '[]'::jsonb
    end,
    scores = case
      when score_path is not null
      then jsonb_build_array(jsonb_build_object('label', 'Simple', 'path', score_path))
      else '[]'::jsonb
    end;

alter table public.salmos drop column audio_path;
alter table public.salmos drop column score_path;
