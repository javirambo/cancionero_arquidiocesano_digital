-- =====================================================================
-- Cancionero Arquidiocesano Digital — Parroquias: simplificar status y
-- abrir ABM a editor + admin.
-- Migración: 0038_parishes_simplify_status_and_rls
--
-- Contexto (decisión 2026-05-15):
--   - Se elimina el estado `pending` y el flujo de aprobación de
--     parroquias. Cualquier parroquia creada queda activa de inmediato.
--   - Solo Editor + Admin pueden crear/editar/borrar parroquias. El
--     coordinator y el member ya no crean parroquias.
--   - La columna `status` se mantiene como soft-delete con dos valores:
--     'active' (visible) | 'inactive' (dada de baja).
--
-- Cambios:
--   1. Backfill: pending/inactive raros → 'active'. Se preserva 'inactive'
--      explícito sólo si ya estaba inactive (decisión: todas a active).
--   2. CHECK de status pasa a admitir solo ('active','inactive').
--   3. DROP policy parishes_insert_self_pending (mig. 0012).
--   4. CREATE policy parishes_editor_write — INSERT/UPDATE/DELETE para
--      is_editor() o is_admin(). (La policy parishes_admin_all del 0002
--      sigue activa para admin; esta amplía a editor.)
--   5. Recrear search_global() para filtrar `status <> 'inactive'` en
--      lugar del antiguo `status = 'active'`. Mantiene todo lo demás.
--
-- IMPORTANTE: las parroquias en estado 'pending' o 'inactive' al
-- aplicar esta migración se llevan a 'active' (decisión Javier
-- 2026-05-15: "Todas pasan a active").
-- =====================================================================

-- 1. Backfill: todas a 'active' antes de cambiar el CHECK.
update public.parishes
   set status = 'active'
 where status <> 'active';

-- 2. Reemplazar CHECK admitiendo solo dos valores.
alter table public.parishes
  drop constraint if exists parishes_status_check;
alter table public.parishes
  add constraint parishes_status_check
  check (status in ('active','inactive'));

-- 3. Quitar la policy que permitía a cualquier autenticado crear en pending.
drop policy if exists parishes_insert_self_pending on public.parishes;

-- 4. Nueva policy de escritura para editor + admin.
drop policy if exists parishes_editor_write on public.parishes;
create policy parishes_editor_write
  on public.parishes for all
  to authenticated
  using (public.is_editor() or public.is_admin())
  with check (public.is_editor() or public.is_admin());

-- 5. Reescribir search_global() para que las parroquias 'inactive' no
--    aparezcan en búsquedas. Base: versión vigente de la mig. 0021
--    (que ya usa el pivote song_categories, sin la antigua columna
--    songs.category_id). Único cambio respecto a 0021: filtro de
--    parroquias pasa de `pa.status = 'active'` a `pa.status <> 'inactive'`.
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
    select pa.id, pa.slug, pa.name, pa.address, pa.city, pa.description
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
    'parishes',  coalesce((select jsonb_agg(to_jsonb(pa)) from parishes_match pa), '[]'::jsonb)
  )
  from norm
  where nq <> '';
$$;

grant execute on function public.search_global(text) to anon, authenticated;
