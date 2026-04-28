-- =====================================================================
-- Cancionero Arquidiocesano Digital — Funciones RPC de búsqueda
-- Migración: 0007_search_rpc
--
-- Provee búsqueda accent-insensitive y case-insensitive sobre canciones,
-- playlists y parroquias. Usa la extensión `unaccent` (ya habilitada en
-- 0001) para normalizar antes de comparar.
--
-- Endpoints:
--   - search_songs(q text)  -> canciones publicadas
--   - search_global(q text) -> JSON con { songs, playlists, parishes }
-- =====================================================================

-- IMMUTABLE wrapper sobre `unaccent` para poder usarlo en índices y
-- expresiones generadas. `unaccent` por defecto es STABLE.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select public.unaccent('public.unaccent', $1);
$$;

-- ---------------------------------------------------------------------
-- Índices accent/case-insensitive con pg_trgm sobre las columnas usadas.
-- ---------------------------------------------------------------------
create index if not exists songs_title_unaccent_trgm_idx
  on public.songs using gin (public.f_unaccent(lower(title)) gin_trgm_ops);
create index if not exists songs_body_unaccent_trgm_idx
  on public.songs using gin (public.f_unaccent(lower(body)) gin_trgm_ops);
create index if not exists authors_name_unaccent_trgm_idx
  on public.authors using gin (public.f_unaccent(lower(name)) gin_trgm_ops);
create index if not exists categories_name_unaccent_trgm_idx
  on public.categories using gin (public.f_unaccent(lower(name)) gin_trgm_ops);
create index if not exists parishes_name_unaccent_trgm_idx
  on public.parishes using gin (public.f_unaccent(lower(name)) gin_trgm_ops);
create index if not exists parishes_city_unaccent_trgm_idx
  on public.parishes using gin (public.f_unaccent(lower(coalesce(city,''))) gin_trgm_ops);
create index if not exists playlists_name_unaccent_trgm_idx
  on public.playlists using gin (public.f_unaccent(lower(name)) gin_trgm_ops);

-- ---------------------------------------------------------------------
-- search_songs(q): canciones publicadas que matchean en título,
-- letra, autor, categoría o número (si q es numérico).
-- ---------------------------------------------------------------------
create or replace function public.search_songs(q text, lim int default 25)
returns table (
  id uuid,
  number int,
  title text,
  slug text,
  category text,
  author text
)
language sql
stable
security invoker
set search_path = public
as $$
  with norm as (
    select
      public.f_unaccent(lower(coalesce(nullif(btrim(q), ''), ''))) as nq,
      case
        when btrim(q) ~ '^\d+$' then btrim(q)::int
        else null
      end as nq_num
  )
  select
    s.id,
    s.number,
    s.title,
    s.slug,
    c.name  as category,
    a.name  as author
  from public.songs s
  left join public.categories c on c.id = s.category_id
  left join public.authors    a on a.id = s.author_id
  cross join norm
  where s.status = 'published'
    and (
      nq = ''
      or public.f_unaccent(lower(s.title))            like '%' || nq || '%'
      or public.f_unaccent(lower(coalesce(s.body,'')))  like '%' || nq || '%'
      or public.f_unaccent(lower(coalesce(c.name,''))) like '%' || nq || '%'
      or public.f_unaccent(lower(coalesce(a.name,''))) like '%' || nq || '%'
      or s.number = nq_num
    )
  order by s.number nulls last, s.title
  limit greatest(1, least(lim, 100));
$$;

grant execute on function public.search_songs(text, int) to anon, authenticated;

-- ---------------------------------------------------------------------
-- search_global(q): JSON con songs[], playlists[], parishes[].
-- Limita 8 por sección.
-- ---------------------------------------------------------------------
create or replace function public.search_global(q text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with norm as (
    select public.f_unaccent(lower(coalesce(nullif(btrim(q), ''), ''))) as nq,
           case when btrim(q) ~ '^\d+$' then btrim(q)::int else null end as nq_num
  ),
  songs_match as (
    select s.id, s.number, s.title, s.slug,
           c.name as category, a.name as author
    from public.songs s
    left join public.categories c on c.id = s.category_id
    left join public.authors    a on a.id = s.author_id
    cross join norm n
    where s.status = 'published'
      and (
        public.f_unaccent(lower(s.title))            like '%' || n.nq || '%'
        or public.f_unaccent(lower(coalesce(s.body,'')))  like '%' || n.nq || '%'
        or public.f_unaccent(lower(coalesce(c.name,''))) like '%' || n.nq || '%'
        or public.f_unaccent(lower(coalesce(a.name,''))) like '%' || n.nq || '%'
        or s.number = n.nq_num
      )
    order by s.number nulls last, s.title
    limit 8
  ),
  playlists_match as (
    select p.id, p.name, p.description, p.event_date,
           jsonb_build_object('name', par.name, 'slug', par.slug) as parish
    from public.playlists p
    left join public.parishes par on par.id = p.parish_id
    cross join norm n
    where p.visibility = 'public'
      and public.f_unaccent(lower(p.name)) like '%' || n.nq || '%'
    order by p.event_date desc nulls last, p.name
    limit 8
  ),
  parishes_match as (
    select pa.id, pa.slug, pa.name, pa.address, pa.city, pa.description
    from public.parishes pa
    cross join norm n
    where pa.is_active
      and (
        public.f_unaccent(lower(pa.name)) like '%' || n.nq || '%'
        or public.f_unaccent(lower(coalesce(pa.city,''))) like '%' || n.nq || '%'
      )
    order by pa.name
    limit 8
  )
  select jsonb_build_object(
    'songs',     coalesce((select jsonb_agg(to_jsonb(s)) from songs_match s), '[]'::jsonb),
    'playlists', coalesce((select jsonb_agg(to_jsonb(p)) from playlists_match p), '[]'::jsonb),
    'parishes',  coalesce((select jsonb_agg(to_jsonb(pa)) from parishes_match pa), '[]'::jsonb)
  )
  from norm
  where nq <> '';
$$;

grant execute on function public.search_global(text) to anon, authenticated;
