-- =====================================================================
-- Cancionero Arquidiocesano Digital — Preferencias de usuario
-- Migración: 0005_user_preferences
-- Referencia: documentacion/casos_de_uso.md (sugerir acordes y similares)
-- =====================================================================

-- Agrega una columna jsonb para guardar preferencias de UI por usuario
-- (ej. suggestChords). Default {} para que toda fila ya existente la tenga.
alter table public.users
  add column if not exists preferences jsonb not null default '{}'::jsonb;

-- =====================================================================
-- Asignar rol admin al usuario fundador (idempotente).
-- =====================================================================
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from public.users u
cross join public.roles r
where u.email = 'jrambaldo@gmail.com'
  and r.name = 'admin'
on conflict do nothing;
