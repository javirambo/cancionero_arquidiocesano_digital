-- =====================================================================
-- Datos dummy para desarrollo de UI (Fase 1)
-- Migración: 0004_seed_dummy_data
-- Idempotente: usa slugs/keys estables y `on conflict do nothing`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Parroquias dummy
-- ---------------------------------------------------------------------
insert into public.parishes (name, slug, address, city, phone, email, description)
values
  ('Catedral de Rosario', 'catedral',
   'Córdoba 38', 'Rosario', '+54 341 421-1234', 'catedral@arquidiocesisrosario.org',
   'Iglesia Catedral Nuestra Señora del Rosario, sede arquidiocesana.'),
  ('Parroquia San Cayetano', 'san-cayetano',
   'Av. Pellegrini 2900', 'Rosario', '+54 341 438-9090', 'sancayetano@arquidiocesisrosario.org',
   'Comunidad parroquial de San Cayetano, devoción al pan y al trabajo.'),
  ('Parroquia Nuestra Señora de Lourdes', 'lourdes',
   'Bv. Oroño 1234', 'Rosario', '+54 341 425-7777', 'lourdes@arquidiocesisrosario.org',
   'Parroquia Lourdes, con coro juvenil activo todos los domingos.'),
  ('Parroquia San José', 'san-jose',
   'San Martín 4500', 'Rosario', '+54 341 461-2020', 'sanjose@arquidiocesisrosario.org',
   'Parroquia San José, ministerio de música tradicional.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Playlists dummy (1 por parroquia + 2 festividades)
-- ---------------------------------------------------------------------
insert into public.playlists (parish_id, slug, name, description, event_date, visibility)
select id, 'domingo-tipo', 'Misa dominical', 'Repertorio habitual de la misa de 11hs.', null, 'public'
from public.parishes where slug = 'catedral'
on conflict (parish_id, slug) do nothing;

insert into public.playlists (parish_id, slug, name, description, event_date, visibility)
select id, 'san-cayetano-7-agosto', 'San Cayetano — 7 de agosto',
       'Repertorio para la festividad patronal.', '2026-08-07', 'public'
from public.parishes where slug = 'san-cayetano'
on conflict (parish_id, slug) do nothing;

insert into public.playlists (parish_id, slug, name, description, event_date, visibility)
select id, 'coro-juvenil', 'Coro juvenil',
       'Selección que prepara el coro juvenil de Lourdes.', null, 'public'
from public.parishes where slug = 'lourdes'
on conflict (parish_id, slug) do nothing;

insert into public.playlists (parish_id, slug, name, description, event_date, visibility)
select id, 'pascua-2026', 'Vigilia Pascual 2026',
       'Repertorio de la Vigilia Pascual.', '2026-04-04', 'public'
from public.parishes where slug = 'san-jose'
on conflict (parish_id, slug) do nothing;

insert into public.playlists (parish_id, slug, name, description, event_date, visibility)
select id, 'navidad-2026', 'Misa de Nochebuena',
       'Cantos para la Misa de Nochebuena.', '2026-12-24', 'public'
from public.parishes where slug = 'catedral'
on conflict (parish_id, slug) do nothing;

-- ---------------------------------------------------------------------
-- playlist_songs: agrego 5 canciones a cada playlist usando las
-- canciones 1..20 del seed 0003.
-- ---------------------------------------------------------------------
-- Limpio relaciones previas para repoblar de forma determinista.
delete from public.playlist_songs
 where playlist_id in (
   select id from public.playlists
    where slug in ('domingo-tipo','san-cayetano-7-agosto','coro-juvenil','pascua-2026','navidad-2026')
 );

with pl as (
  select id, slug from public.playlists
   where slug in ('domingo-tipo','san-cayetano-7-agosto','coro-juvenil','pascua-2026','navidad-2026')
), s as (
  select id, number from public.songs where number between 1 and 20
)
insert into public.playlist_songs (playlist_id, song_id, position)
select pl.id, s.id,
       row_number() over (partition by pl.id order by s.number)
  from pl
  join s on (
       (pl.slug = 'domingo-tipo'           and s.number in (1, 4, 7, 11, 20))
    or (pl.slug = 'san-cayetano-7-agosto'  and s.number in (2, 5, 9, 14, 16))
    or (pl.slug = 'coro-juvenil'           and s.number in (3, 6, 12, 15, 19))
    or (pl.slug = 'pascua-2026'            and s.number in (8, 10, 13, 15, 17))
    or (pl.slug = 'navidad-2026'           and s.number in (1, 7, 11, 17, 18))
  );

-- ---------------------------------------------------------------------
-- Festividades litúrgicas dummy
-- ---------------------------------------------------------------------
insert into public.liturgical_events (name, slug, event_date, kind, playlist_id, description)
select 'San Cayetano', 'san-cayetano-2026', '2026-08-07', 'memoria', p.id,
       'Memoria de San Cayetano, patrono del pan y el trabajo.'
from public.playlists p
join public.parishes pa on pa.id = p.parish_id
where p.slug = 'san-cayetano-7-agosto' and pa.slug = 'san-cayetano'
on conflict (slug) do nothing;

insert into public.liturgical_events (name, slug, event_date, kind, playlist_id, description)
select 'Vigilia Pascual', 'vigilia-pascual-2026', '2026-04-04', 'solemnidad', p.id,
       'Vigilia Pascual: la noche más santa del año litúrgico.'
from public.playlists p
join public.parishes pa on pa.id = p.parish_id
where p.slug = 'pascua-2026' and pa.slug = 'san-jose'
on conflict (slug) do nothing;

insert into public.liturgical_events (name, slug, event_date, kind, playlist_id, description)
select 'Natividad del Señor', 'navidad-2026', '2026-12-25', 'solemnidad', p.id,
       'Solemnidad de la Natividad del Señor.'
from public.playlists p
join public.parishes pa on pa.id = p.parish_id
where p.slug = 'navidad-2026' and pa.slug = 'catedral'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- Featured content (novedad de hoy)
-- ---------------------------------------------------------------------
insert into public.featured_content (title, body, target_kind, target_id, starts_at, ends_at, priority, is_active)
select 'Nueva playlist: Coro juvenil de Lourdes',
       'El coro juvenil de Lourdes publicó su selección habitual.',
       'playlist', p.id,
       now() - interval '1 day', now() + interval '30 days',
       10, true
from public.playlists p where p.slug = 'coro-juvenil'
on conflict do nothing;
