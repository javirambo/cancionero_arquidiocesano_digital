-- =============================================================
-- Migración: 0011_parishes_status
-- Reemplaza `parishes.is_active` (boolean) por `parishes.status`
-- (text) con tres estados:
--   - 'active'   : parroquia visible en listados públicos.
--   - 'pending'  : creada por un member, pendiente de aprobación.
--   - 'inactive' : dada de baja (equivalente al antiguo is_active=false).
--
-- Cambios:
--   1. Agrega columna `status` con check, default 'active'.
--   2. Backfill: status = 'active' si is_active, 'inactive' si no.
--   3. Actualiza RLS de SELECT para usar `status = 'active'`.
--   4. Recrea la RPC `search_global` para filtrar por status.
--   5. Drop de la columna `is_active`.
--
-- IMPORTANTE: aplicar después de 0010.
-- =============================================================

-- 1. Nueva columna status.
alter table public.parishes
  add column status text not null default 'active'
    check (status in ('active','pending','inactive'));

-- 2. Backfill desde is_active.
update public.parishes
  set status = case when is_active then 'active' else 'inactive' end;

-- 3. Política RLS de SELECT: reemplazar la que usa is_active.
drop policy if exists parishes_select_public on public.parishes;
create policy parishes_select_public
  on public.parishes for select
  using (status = 'active' or public.is_editor());

-- 4. Recrear `search_global` con `status = 'active'` en lugar de `is_active`.
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

-- 5. Drop de is_active.
alter table public.parishes drop column is_active;
