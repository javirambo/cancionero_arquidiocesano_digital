-- =====================================================================
-- Cancionero Arquidiocesano Digital — RPC de búsqueda para admin
-- Migración: 0049_admin_search_songs
-- =====================================================================
--
-- Contexto:
--   La vista /admin/canciones lista canciones de TODOS los estados
--   (draft, review, published, archived) y permite buscar por título o
--   número. Hasta ahora usaba PostgREST `.ilike("title", …)`, que NO
--   ignora acentos. El resto del proyecto (search_songs, search_global)
--   ya usa `public.f_unaccent` para búsqueda accent/case-insensitive.
--
--   Esta migración expone `admin_search_songs` siguiendo el mismo patrón
--   que `search_songs` (definido en 0007_search_rpc), pero:
--     - no filtra por status (devuelve todos);
--     - permite filtrar por status concreto vía parámetro;
--     - soporta ordenamiento por última modificación, número o título;
--     - devuelve los campos que necesita el panel admin.
--
--   El acceso queda restringido a editores/admin: la función es
--   `security invoker` y se otorga execute únicamente a `authenticated`;
--   adicionalmente se chequea `is_editor() or is_admin()` dentro del
--   cuerpo para evitar ejecución por miembros normales.
-- =====================================================================

begin;

create or replace function public.admin_search_songs(
  q       text default '',
  p_status text default 'todas',  -- 'todas' | 'draft' | 'review' | 'published' | 'archived'
  p_orden  text default 'modificacion', -- 'modificacion' | 'numero' | 'nombre'
  lim      int  default 200
)
returns table (
  id           uuid,
  number       int,
  title        text,
  slug         text,
  status       text,
  updated_at   timestamptz,
  body         text,
  youtube_url  text,
  has_files    boolean,
  authors      text,
  categories   text
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
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
    s.status::text                                              as status,
    s.updated_at,
    s.body,
    s.youtube_url,
    exists (select 1 from public.song_files sf where sf.song_id = s.id) as has_files,
    (
      select string_agg(a.name, ', ' order by a.name)
        from (
          select an.name from public.authors an where an.id = s.author_id
          union all
          select an.name from public.authors an where an.id = s.author2_id
        ) a
    )                                                            as authors,
    (
      select string_agg(c.name, ', ' order by c.name)
        from public.song_categories sc
        join public.categories c on c.id = sc.category_id
       where sc.song_id = s.id
    )                                                            as categories
  from public.songs s
  cross join norm n
  where (p_status = 'todas' or s.status::text = p_status)
    and (
      n.nq = ''
      or public.f_unaccent(lower(s.title)) like '%' || n.nq || '%'
      or s.number = n.nq_num
    )
  order by
    case when p_orden = 'numero'  then s.number end asc nulls last,
    case when p_orden = 'nombre'  then s.title  end asc,
    case when p_orden = 'modificacion' then s.updated_at end desc
  limit greatest(1, least(lim, 500));
end;
$$;

grant execute on function public.admin_search_songs(text, text, text, int) to authenticated;

commit;
