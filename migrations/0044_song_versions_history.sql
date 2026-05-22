-- =====================================================================
-- Cancionero Arquidiocesano Digital — Historial de versiones de canciones
-- Migración: 0044_song_versions_history
-- =====================================================================
--
-- Contexto:
--   La tabla `song_versions` se poblaba solo desde `approve_song` (al
--   aprobar una canción desde el estado `review`). Las ediciones directas
--   sobre canciones ya publicadas (CU-16.1, flujo del Editor) NO generaban
--   versión, y además ninguna pantalla consultaba el historial: las
--   versiones se guardaban pero nunca se usaban.
--
-- Cambios:
--   1. `approve_song(uuid, text)` — agrega parámetro opcional
--      `p_change_summary` para registrar el resumen del cambio en el
--      snapshot. Misma lógica que 0025 (sin tocar `song_files`).
--   2. `save_published_song_version(uuid, text)` — RPC nuevo. Materializa
--      una nueva versión al guardar la edición directa de una canción que
--      ya está `published`, e incrementa `songs.current_version`.
--   3. `restore_song_version(uuid, int)` — RPC nuevo. Copia el contenido
--      de una versión anterior de vuelta a `songs` (incluyendo categorías).
--      NO cambia `songs.status`: la canción queda en su estado actual para
--      que el Editor revise y guarde/publique normalmente.
--   4. `get_song_versions(uuid)` — RPC nuevo. Devuelve el historial con el
--      nombre/email del Editor resuelto. Necesario porque `public.users`
--      tiene RLS restrictiva (un usuario solo se ve a sí mismo o admin).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. approve_song con change_summary opcional
--    Se elimina la firma anterior `approve_song(uuid)` para que la nueva
--    `approve_song(uuid, text)` no quede como sobrecarga ambigua.
-- ---------------------------------------------------------------------
drop function if exists public.approve_song(uuid);

create or replace function public.approve_song(
  p_song_id        uuid,
  p_change_summary text default null
)
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
    youtube_url, author_id, change_summary,
    submitted_by, reviewed_by, published_at
  ) values (
    s.id, v_version, s.title, s.body, s.original_key, s.tempo_bpm,
    s.youtube_url, s.author_id, nullif(btrim(p_change_summary), ''),
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
end;
$$;

-- ---------------------------------------------------------------------
-- 2. save_published_song_version
--    Registra una versión nueva al editar directamente una canción ya
--    publicada. El UPDATE de los campos lo hace el cliente sobre `songs`;
--    esta RPC se llama después para materializar el snapshot.
-- ---------------------------------------------------------------------
create or replace function public.save_published_song_version(
  p_song_id        uuid,
  p_change_summary text default null
)
returns int
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
  if s.status <> 'published' then
    raise exception 'song is not published (status: %)', s.status
      using errcode = 'P0001';
  end if;

  v_version := coalesce(s.current_version, 0) + 1;

  insert into public.song_versions (
    song_id, version, title, body, original_key, tempo_bpm,
    youtube_url, author_id, change_summary,
    submitted_by, reviewed_by, published_at
  ) values (
    s.id, v_version, s.title, s.body, s.original_key, s.tempo_bpm,
    s.youtube_url, s.author_id, nullif(btrim(p_change_summary), ''),
    v_uid, v_uid, v_now
  );

  insert into public.song_version_categories (song_id, version, category_id)
  select s.id, v_version, sc.category_id
    from public.song_categories sc
   where sc.song_id = s.id;

  update public.songs
     set current_version = v_version
   where id = p_song_id;

  return v_version;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. restore_song_version
--    Copia el contenido de una versión anterior de vuelta a `songs`.
--    NO cambia `songs.status`: la canción permanece en su estado actual
--    y el Editor decide guardar/publicar después.
-- ---------------------------------------------------------------------
create or replace function public.restore_song_version(
  p_song_id uuid,
  p_version int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v        public.song_versions;
begin
  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select * into v
    from public.song_versions
   where song_id = p_song_id and version = p_version;
  if not found then
    raise exception 'version not found' using errcode = 'P0002';
  end if;

  update public.songs
     set title        = v.title,
         body         = v.body,
         original_key = v.original_key,
         tempo_bpm    = v.tempo_bpm,
         youtube_url  = v.youtube_url,
         author_id    = v.author_id
   where id = p_song_id;

  -- Restaurar las categorías del snapshot de esa versión.
  delete from public.song_categories where song_id = p_song_id;
  insert into public.song_categories (song_id, category_id)
  select p_song_id, svc.category_id
    from public.song_version_categories svc
   where svc.song_id = p_song_id and svc.version = p_version;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. get_song_versions
--    Historial de una canción con el nombre/email del Editor resuelto.
--    security definer para sortear la RLS restrictiva de `public.users`.
-- ---------------------------------------------------------------------
create or replace function public.get_song_versions(p_song_id uuid)
returns table (
  version          int,
  title            text,
  body             text,
  original_key     text,
  tempo_bpm        int,
  youtube_url      text,
  change_summary   text,
  published_at     timestamptz,
  reviewed_by      uuid,
  reviewed_by_name text,
  category_names   text[]
)
language sql
security definer
set search_path = public
as $$
  select
    sv.version,
    sv.title,
    sv.body,
    sv.original_key,
    sv.tempo_bpm,
    sv.youtube_url,
    sv.change_summary,
    sv.published_at,
    sv.reviewed_by,
    coalesce(u.display_name, u.email) as reviewed_by_name,
    coalesce(
      (select array_agg(c.name order by c.name)
         from public.song_version_categories svc
         join public.categories c on c.id = svc.category_id
        where svc.song_id = sv.song_id and svc.version = sv.version),
      array[]::text[]
    ) as category_names
  from public.song_versions sv
  left join public.users u on u.id = sv.reviewed_by
  where sv.song_id = p_song_id
  order by sv.version desc;
$$;

grant execute on function public.approve_song(uuid, text)
  to authenticated;
grant execute on function public.save_published_song_version(uuid, text)
  to authenticated;
grant execute on function public.restore_song_version(uuid, int)
  to authenticated;
grant execute on function public.get_song_versions(uuid)
  to authenticated;

commit;
