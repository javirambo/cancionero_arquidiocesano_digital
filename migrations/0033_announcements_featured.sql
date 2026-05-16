-- Migración: 0033_announcements_featured
-- Propósito: agregar columna `featured` (boolean) a `announcements`.
--            Si está en true, el anuncio se muestra como popup fullscreen
--            en la Home cada vez que se carga la página.

alter table public.announcements
  add column if not exists featured boolean not null default false;

create index if not exists announcements_featured_idx
  on public.announcements(featured)
  where featured = true;
