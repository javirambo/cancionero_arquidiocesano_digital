-- =====================================================================
-- Cancionero Arquidiocesano Digital — Fix RPC search_global
-- Migración: 0020_fix_search_global
-- Referencia: migración 0018 (drop de playlists.event_date),
--             migración 0011 (definición previa de search_global).
--
-- Contexto:
--   La RPC `search_global` quedó desactualizada tras la 0018, que
--   eliminó la columna `playlists.event_date`. La función seguía
--   seleccionando y ordenando por esa columna, por lo que cualquier
--   búsqueda desde el header devolvía 500.
--
-- Cambios:
--   1. Recrear `search_global` sin referencias a `event_date`.
--      El bloque `playlists_match` ahora ordena solo por `p.name`.
--      El resto de la función queda idéntico a la versión 0011.
-- =====================================================================

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
    select p.id, p.name, p.description,
           jsonb_build_object('name', par.name, 'slug', par.slug) as parish
    from public.playlists p
    left join public.parishes par on par.id = p.parish_id
    cross join norm n
    where p.visibility = 'public'
      and public.f_unaccent(lower(p.name)) like '%' || n.nq || '%'
    order by p.name
    limit 8
  ),
  parishes_match as (
    select pa.id, pa.slug, pa.name, pa.address, pa.city, pa.description
    from public.parishes pa
    cross join norm n
    where pa.status = 'active'
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
