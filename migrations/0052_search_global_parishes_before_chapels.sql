-- 0052: en la búsqueda global, las parroquias aparecen antes que las capillas.
--
-- Base: versión vigente de search_global de la mig. 0038 (última que la
-- redefine). Cambios respecto a 0038, acotados al bloque parishes_match:
--   1. Se agrega pa.parent_id al select (una capilla es una parroquia con
--      parent_id no nulo; ver modelo_de_datos.md, tabla parishes).
--   2. El jsonb_agg ordena primero por (parent_id is not null) y luego por
--      nombre, de modo que las parroquias preceden a las capillas.
-- El `order by pa.name` + `limit 8` del CTE se mantienen intactos a
-- propósito: qué 8 resultados entran no cambia, solo el orden en que se
-- muestran.
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
  song_cats as (
    select sc.song_id,
           string_agg(c.name, ', ' order by c.sort_order, c.name) as names,
           public.f_unaccent(lower(string_agg(c.name, ' '))) as names_norm
      from public.song_categories sc
      join public.categories c on c.id = sc.category_id
     group by sc.song_id
  ),
  songs_match as (
    select s.id, s.number, s.title, s.slug,
           coalesce(sc.names, '') as category, a.name as author
    from public.songs s
    left join song_cats         sc on sc.song_id = s.id
    left join public.authors    a  on a.id = s.author_id
    cross join norm n
    where s.status = 'published'
      and (
        public.f_unaccent(lower(s.title))            like '%' || n.nq || '%'
        or public.f_unaccent(lower(coalesce(s.body,'')))  like '%' || n.nq || '%'
        or coalesce(sc.names_norm, '')                    like '%' || n.nq || '%'
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
    select pa.id, pa.slug, pa.name, pa.address, pa.city, pa.description,
           pa.parent_id
    from public.parishes pa
    cross join norm n
    where pa.status <> 'inactive'
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
    'parishes',  coalesce((
      select jsonb_agg(
               to_jsonb(pa)
               order by (pa.parent_id is not null), pa.name
             )
      from parishes_match pa
    ), '[]'::jsonb)
  )
  from norm
  where nq <> '';
$$;

grant execute on function public.search_global(text) to anon, authenticated;
