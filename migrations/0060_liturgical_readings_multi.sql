-- =====================================================================
-- Cancionero Arquidiocesano Digital — Lecturas: varias lecturas por día
-- Migración: 0060_liturgical_readings_multi
-- Referencia: documentacion/modelo_de_datos.md (liturgical_readings)
--             documentacion/calendario-liturgico-y-lecturas.md (§3, §4)
--
-- Decisión: hay días litúrgicos que NO entran en el modelo cerrado de dos
-- sets (principal/memoria) ni en un único color:
--   - Días "empaquetados" con >2 lecturas: Navidad (misas de la noche,
--     aurora y día → L2512n/a/d), o el 24/12 (feria de Adviento + Misa
--     vespertina de la vigilia). El ORDO los trae en una sola entrada y
--     necesitamos varias filas por fecha.
--   - Días con dos colores litúrgicos posibles: "Verde o Blanco",
--     "Morado o Rosado" (feria vs. memoria libre; 3er domingo de Adviento).
--
-- Cambios:
--   1. Relajar el CHECK de reading_set → texto libre. Convención de valores:
--      'principal' | 'memoria' | 'vigilia' | 'noche' | 'aurora' | 'dia'
--      y, ante colisión, sufijo numérico ('principal-2', …). Se conserva el
--      default 'principal' y el unique (event_date, reading_set).
--   2. Relajar el CHECK de color → texto libre, para guardar el combinado
--      tal cual viene del ORDO (p. ej. 'morado o rosa'). La UI lo parte por
--      ' o ' (ver lib/liturgical-colors.ts).
--
-- Notas:
--   - jsonb de las secciones/salmo NO cambia de columna (es sin esquema): las
--     alternativas "o bien" van dentro del propio jsonb
--     (first_reading.alternatives[], psalm.alt_responses[]). Sin migración.
--   - unique (event_date, reading_set), RLS y trigger se heredan de 0056:
--     NO se tocan. Los datos existentes quedan intactos.
--   - Idempotente: usa `drop constraint if exists`.
-- =====================================================================

alter table public.liturgical_readings
  drop constraint if exists liturgical_readings_reading_set_check;

alter table public.liturgical_readings
  drop constraint if exists liturgical_readings_color_check;

comment on column public.liturgical_readings.reading_set is
  'Discriminador de la lectura dentro de la fecha. Convención: principal | memoria | '
  'vigilia | noche | aurora | dia (sufijo -2/-3 ante colisión). Único por event_date.';

comment on column public.liturgical_readings.color is
  'Color litúrgico (texto libre). Puede venir combinado del ORDO: "morado o rosa". '
  'La UI lo parte por " o " (ver lib/liturgical-colors.ts).';
