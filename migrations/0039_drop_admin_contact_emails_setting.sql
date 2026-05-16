-- =====================================================================
-- Cancionero Arquidiocesano Digital — Borrar setting admin_contact_emails
-- Migración: 0039_drop_admin_contact_emails_setting
--
-- Contexto:
--   El setting 'admin_contact_emails' (mig. 0028) era un fallback para
--   mostrar contactos cuando una parroquia no tenía Coordinador asignado.
--   La lógica de contactos de CU-26 dejó de usarlo: hoy se consultan
--   directamente parish_members + get_users_by_global_role.
--   El form en /admin/parroquias quedaba huérfano y con texto incorrecto.
--   Decisión 2026-05-15: eliminar el setting y su UI.
--
-- Cambios:
--   1. DELETE de la fila settings(key='admin_contact_emails').
--
-- IMPORTANTE: la mig. 0028 ya no aporta nada; la dejamos en el historial
-- por trazabilidad. Esta migración revierte su efecto.
-- =====================================================================

delete from public.settings
 where key = 'admin_contact_emails';
