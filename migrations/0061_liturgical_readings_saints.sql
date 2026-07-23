-- =====================================================================
-- Cancionero Arquidiocesano Digital — Lecturas: santos del día
-- Migración: 0061_liturgical_readings_saints
-- Referencia: documentacion/modelo_de_datos.md (liturgical_readings)
--             documentacion/calendario-liturgico-y-lecturas.md (§3)
--
-- Decisión: el ORDO de curas.com.ar trae, por día, la(s) biografía(s) del/de
-- los santo(s) en ordo2[1] y ordo2[2] (hasta 2, a veces más de un santo el
-- mismo día). El texto vive en las páginas .../Misal3/Biografias3/BiografiasMM.htm
-- ancladas por día (<a name="23">, "23b", …). Antes se ignoraba; ahora el
-- script de ingesta lo extrae y lo guarda.
--
-- Cambios:
--   1. Agregar liturgical_readings.saints jsonb (nullable).
--      Forma: [{ name, description, bio_url, bio }]
--        - name        : nombre del santo (ordo2[1]/[2])
--        - description : "presbítero" / "religiosa" / … (nullable)
--        - bio_url     : URL de la biografía en curas.com.ar (+ ancla, nullable)
--        - bio         : texto de la biografía (nullable si no hay link)
--      NULL = día sin santo (feria/domingo). Se replica en cada fila del día
--      (el santo es del día, no de un reading_set en particular).
--
-- Notas:
--   - jsonb sin CHECK (contenido variable). RLS y trigger se heredan de 0056.
--   - Derechos de autor: el texto de las biografías tiene derechos; se guarda
--     para uso interno (mismo criterio que las lecturas, ver §8 del doc).
-- =====================================================================

alter table public.liturgical_readings add column saints jsonb;

comment on column public.liturgical_readings.saints is
  'Santos del día (ordo2[1]/[2]): [{name, description, bio_url, bio}]. '
  'bio = texto de la biografía (curas.com.ar/Misal3/Biografias3). NULL = sin santo.';
