-- =====================================================================
-- Cancionero Arquidiocesano Digital — Seed admin_contact_emails
-- Migración: 0028_seed_admin_contact_emails
--
-- Contexto:
--   La tabla public.settings (key->value jsonb) ya existe desde la 0001
--   con RLS adecuada (SELECT público, escritura solo admin). Este seed
--   inicializa el setting 'admin_contact_emails' (array de strings) que
--   se muestra en la vista pública de parroquia cuando esa parroquia no
--   tiene Coordinador asignado.
-- =====================================================================

insert into public.settings (key, value)
values ('admin_contact_emails', '[]'::jsonb)
on conflict (key) do nothing;
