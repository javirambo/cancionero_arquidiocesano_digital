-- =====================================================================
-- Cancionero Arquidiocesano Digital — Multi-categoría por canción + drop tags
-- Migración: 0021_songs_multi_category_drop_tags
--
-- Contexto:
--   Hasta ahora `songs.category_id` permitía UNA sola categoría litúrgica
--   por canción. Necesitamos soportar múltiples (una canción puede ser
--   apta para Entrada y Salida, o Comunión y Mariana, etc.).
--
--   Se aprovecha para eliminar `songs.tags` (text[]) que no se usa en
--   filtros, búsqueda ni vista pública (solo aparece como input libre
--   en el form admin sin consumidores).
--
-- Cambios:
--   1. Crear tabla pivote `song_categories (song_id, category_id)`.
--   2. Crear tabla pivote `song_version_categories (song_id, version, category_id)`.
--   3. Backfill: migrar `songs.category_id` y `song_versions.category_id`
--      existentes a las pivotes.
--   4. Drop columnas: `songs.category_id`, `songs.tags`,
--      `song_versions.category_id`, `song_versions.tags`.
--   5. Recrear `search_songs` y `search_global` usando join via pivote
--      y `string_agg` para devolver múltiples categorías concatenadas.
--   6. Recrear `approve_song` para copiar `song_categories` a
--      `song_version_categories` al publicar.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Tabla pivote song_categories
-- ---------------------------------------------------------------------
create table public.song_categories (
  song_id     uuid not null references public.songs(id)      on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (song_id, category_id)
);
create index song_categories_category_id_idx on public.song_categories(category_id);

alter table public.song_categories enable row level security;

-- Lectura: igual que songs (cualquiera puede leer published; el resto
-- queda gobernado por las policies de songs vía join). Para simplificar
-- abrimos lectura amplia; las policies de songs ya filtran qué canción
-- se ve.
create policy song_categories_select_all
  on public.song_categories for select
  using (true);

-- Escritura: solo roles con permiso sobre songs (editor/admin/coordinador)
-- vía función helper existente. Reusamos is_editor()/is_admin().
create policy song_categories_write_editors
  on public.song_categories for all
  using (public.is_editor() or public.is_admin())
  with check (public.is_editor() or public.is_admin());

-- ---------------------------------------------------------------------
-- 2. Tabla pivote song_version_categories
-- ---------------------------------------------------------------------
create table public.song_version_categories (
  song_id     uuid not null,
  version     int  not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (song_id, version, category_id),
  foreign key (song_id, version)
    references public.song_versions(song_id, version) on delete cascade
);
create index song_version_categories_category_id_idx
  on public.song_version_categories(category_id);

alter table public.song_version_categories enable row level security;

create policy song_version_categories_select_all
  on public.song_version_categories for select
  using (true);

create policy song_version_categories_write_editors
  on public.song_version_categories for all
  using (public.is_editor() or public.is_admin())
  with check (public.is_editor() or public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Backfill de datos existentes
-- ---------------------------------------------------------------------
insert into public.song_categories (song_id, category_id)
select id, category_id
  from public.songs
 where category_id is not null
on conflict do nothing;

insert into public.song_version_categories (song_id, version, category_id)
select song_id, version, category_id
  from public.song_versions
 where category_id is not null
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 4. Drop columnas viejas
-- ---------------------------------------------------------------------
drop index if exists public.songs_category_id_idx;

alter table public.songs        drop column category_id;
alter table public.songs        drop column tags;
alter table public.song_versions drop column category_id;
alter table public.song_versions drop column tags;

-- ---------------------------------------------------------------------
-- 5. Recrear RPCs de búsqueda
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
  ),
  song_cats as (
    select sc.song_id,
           string_agg(c.name, ', ' order by c.sort_order, c.name) as names,
           public.f_unaccent(lower(string_agg(c.name, ' '))) as names_norm
      from public.song_categories sc
      join public.categories c on c.id = sc.category_id
     group by sc.song_id
  )
  select
    s.id,
    s.number,
    s.title,
    s.slug,
    coalesce(sc.names, '') as category,
    a.name                  as author
  from public.songs s
  left join song_cats         sc on sc.song_id = s.id
  left join public.authors    a  on a.id = s.author_id
  cross join norm
  where s.status = 'published'
    and (
      nq = ''
      or public.f_unaccent(lower(s.title))            like '%' || nq || '%'
      or public.f_unaccent(lower(coalesce(s.body,'')))  like '%' || nq || '%'
      or coalesce(sc.names_norm, '')                    like '%' || nq || '%'
      or public.f_unaccent(lower(coalesce(a.name,''))) like '%' || nq || '%'
      or s.number = nq_num
    )
  order by s.number nulls last, s.title
  limit greatest(1, least(lim, 100));
$$;

grant execute on function public.search_songs(text, int) to anon, authenticated;

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

-- ---------------------------------------------------------------------
-- 6. Recrear approve_song para snapshotear categorías al publicar
-- ---------------------------------------------------------------------
create or replace function public.approve_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_now     timestamptz := now();
  v_version int;
  s         public.songs;
begin
  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into s from public.songs where id = p_song_id for update;
  if not found then
    raise exception 'song not found' using errcode = 'P0002';
  end if;
  if s.status <> 'review' then
    raise exception 'invalid transition from %', s.status using errcode = 'P0001';
  end if;

  v_version := coalesce(s.current_version, 0) + 1;

  insert into public.song_versions (
    song_id, version, title, body, original_key, tempo_bpm,
    youtube_url, author_id,
    submitted_by, reviewed_by, published_at
  ) values (
    s.id, v_version, s.title, s.body, s.original_key, s.tempo_bpm,
    s.youtube_url, s.author_id,
    s.submitted_by, v_uid, v_now
  );

  -- Snapshot de categorías actuales en la pivote de versiones
  insert into public.song_version_categories (song_id, version, category_id)
  select s.id, v_version, sc.category_id
    from public.song_categories sc
   where sc.song_id = s.id;

  update public.songs
     set status          = 'published',
         current_version = v_version,
         reviewed_by     = v_uid,
         reviewed_at     = v_now,
         published_at    = v_now,
         review_notes    = null
   where id = p_song_id;

  update public.song_files
     set status       = 'published',
         reviewed_by  = v_uid,
         reviewed_at  = v_now,
         published_at = v_now
   where song_id = p_song_id
     and status  = 'review';
end;
$$;

commit;
