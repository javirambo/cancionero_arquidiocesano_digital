-- =====================================================================
-- Cancionero Arquidiocesano Digital — Bitácora de eventos de canciones
-- Migración: 0045_song_events_log
-- =====================================================================
--
-- Contexto:
--   El historial solo registraba snapshots de contenido publicado
--   (`song_versions`). Eventos como archivar, despublicar, rechazar o
--   enviar a revisión no quedaban registrados en ningún lado, por lo que
--   la fecha "Modificada" de una canción (songs.updated_at) no se podía
--   explicar desde la UI.
--
-- Cambios:
--   1. Tabla `song_events` — bitácora cronológica de toda la vida
--      editorial de una canción.
--   2. Helper `log_song_event(...)` para insertar eventos desde los RPCs.
--   3. Recrear los RPCs de transición de estado para que registren su
--      evento. Aprovechando la recreación, `unpublish_song` y
--      `reject_song` se corrigen: la migración 0017 eliminó la columna
--      `song_files.status` pero esos dos RPCs seguían referenciándola,
--      por lo que fallaban al ejecutarse (mismo bug que 0025 arregló en
--      `approve_song`).
--   4. `change_summary` autogenerado en `approve_song` /
--      `save_published_song_version` comparando contra la versión previa.
--   5. RPC `get_song_events(uuid)` para leer la bitácora con el nombre
--      del actor resuelto.
--   6. Backfill: un evento `published` por cada fila ya existente en
--      `song_versions`.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Tabla song_events
-- ---------------------------------------------------------------------
create table public.song_events (
  id         uuid primary key default gen_random_uuid(),
  song_id    uuid not null references public.songs(id) on delete cascade,
  event      text not null check (event in (
    'created', 'submitted', 'withdrawn', 'published', 'edited',
    'rejected', 'unpublished', 'archived', 'unarchived', 'restored'
  )),
  version    int,
  summary    text,
  actor_id   uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index song_events_song_id_created_idx
  on public.song_events(song_id, created_at desc);

alter table public.song_events enable row level security;

create policy song_events_select_all
  on public.song_events for select
  using (true);

create policy song_events_insert_editors
  on public.song_events for insert
  with check (public.is_editor() or public.is_admin());

-- No update / no delete (bitácora inmutable → intencionalmente sin policy).

-- ---------------------------------------------------------------------
-- 2. Helper log_song_event
-- ---------------------------------------------------------------------
create or replace function public.log_song_event(
  p_song_id uuid,
  p_event   text,
  p_version int  default null,
  p_summary text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.song_events (song_id, event, version, summary, actor_id)
  values (p_song_id, p_event, p_version, nullif(btrim(p_summary), ''), auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 2b. Helper build_change_summary
--     Genera un resumen comparando la canción actual contra su última
--     versión publicada. Devuelve null si no hay versión previa.
-- ---------------------------------------------------------------------
create or replace function public.build_change_summary(p_song_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  s     public.songs;
  prev  public.song_versions;
  parts text[] := array[]::text[];
begin
  select * into s from public.songs where id = p_song_id;
  if not found then
    return null;
  end if;

  select * into prev
    from public.song_versions
   where song_id = p_song_id
   order by version desc
   limit 1;
  if not found then
    return 'Publicación inicial';
  end if;

  if coalesce(s.title, '') is distinct from coalesce(prev.title, '') then
    parts := parts || 'título';
  end if;
  if coalesce(s.body, '') is distinct from coalesce(prev.body, '') then
    parts := parts || 'letra';
  end if;
  if coalesce(s.original_key, '') is distinct from coalesce(prev.original_key, '') then
    parts := parts || 'tono';
  end if;
  if coalesce(s.tempo_bpm, -1) is distinct from coalesce(prev.tempo_bpm, -1) then
    parts := parts || 'tempo';
  end if;
  if coalesce(s.youtube_url, '') is distinct from coalesce(prev.youtube_url, '') then
    parts := parts || 'video';
  end if;
  if s.author_id is distinct from prev.author_id then
    parts := parts || 'autor';
  end if;
  -- Categorías: comparar el set vigente contra el snapshot de la versión previa.
  if exists (
        select category_id from public.song_categories
         where song_id = p_song_id
        except
        select category_id from public.song_version_categories
         where song_id = p_song_id and version = prev.version
      )
     or exists (
        select category_id from public.song_version_categories
         where song_id = p_song_id and version = prev.version
        except
        select category_id from public.song_categories
         where song_id = p_song_id
      )
  then
    parts := parts || 'categorías';
  end if;

  if array_length(parts, 1) is null then
    return 'Sin cambios de contenido';
  end if;
  return 'Cambió ' || array_to_string(parts, ', ');
end;
$$;

-- ---------------------------------------------------------------------
-- 3. submit_song_for_review  (+ evento 'submitted')
-- ---------------------------------------------------------------------
create or replace function public.submit_song_for_review(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;
  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select status into v_status from public.songs where id = p_song_id;
  if v_status is null then
    raise exception 'song not found' using errcode = 'P0002';
  end if;
  if v_status not in ('draft','rejected') then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status       = 'review',
         submitted_by = v_uid,
         submitted_at = now(),
         review_notes = null
   where id = p_song_id;

  perform public.log_song_event(p_song_id, 'submitted');
end;
$$;

-- ---------------------------------------------------------------------
-- 4. withdraw_song_from_review  (+ evento 'withdrawn')
-- ---------------------------------------------------------------------
create or replace function public.withdraw_song_from_review(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;
  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select status into v_status from public.songs where id = p_song_id;
  if v_status is null then
    raise exception 'song not found' using errcode = 'P0002';
  end if;
  if v_status <> 'review' then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status       = 'draft',
         submitted_by = null,
         submitted_at = null
   where id = p_song_id;

  perform public.log_song_event(p_song_id, 'withdrawn');
end;
$$;

-- ---------------------------------------------------------------------
-- 5. approve_song  (+ evento 'published', change_summary autogenerado)
-- ---------------------------------------------------------------------
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
  v_summary text;
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

  -- Resumen: el provisto manualmente tiene prioridad; si no, autogenerar.
  v_summary := coalesce(
    nullif(btrim(p_change_summary), ''),
    public.build_change_summary(p_song_id)
  );

  v_version := coalesce(s.current_version, 0) + 1;

  insert into public.song_versions (
    song_id, version, title, body, original_key, tempo_bpm,
    youtube_url, author_id, change_summary,
    submitted_by, reviewed_by, published_at
  ) values (
    s.id, v_version, s.title, s.body, s.original_key, s.tempo_bpm,
    s.youtube_url, s.author_id, v_summary,
    s.submitted_by, v_uid, v_now
  );

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

  perform public.log_song_event(p_song_id, 'published', v_version, v_summary);
end;
$$;

-- ---------------------------------------------------------------------
-- 6. save_published_song_version  (+ evento 'edited')
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
  v_summary text;
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

  v_summary := coalesce(
    nullif(btrim(p_change_summary), ''),
    public.build_change_summary(p_song_id)
  );

  v_version := coalesce(s.current_version, 0) + 1;

  insert into public.song_versions (
    song_id, version, title, body, original_key, tempo_bpm,
    youtube_url, author_id, change_summary,
    submitted_by, reviewed_by, published_at
  ) values (
    s.id, v_version, s.title, s.body, s.original_key, s.tempo_bpm,
    s.youtube_url, s.author_id, v_summary,
    v_uid, v_uid, v_now
  );

  insert into public.song_version_categories (song_id, version, category_id)
  select s.id, v_version, sc.category_id
    from public.song_categories sc
   where sc.song_id = s.id;

  update public.songs
     set current_version = v_version
   where id = p_song_id;

  perform public.log_song_event(p_song_id, 'edited', v_version, v_summary);
  return v_version;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. restore_song_version  (+ evento 'restored')
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
  v public.song_versions;
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

  delete from public.song_categories where song_id = p_song_id;
  insert into public.song_categories (song_id, category_id)
  select p_song_id, svc.category_id
    from public.song_version_categories svc
   where svc.song_id = p_song_id and svc.version = p_version;

  perform public.log_song_event(
    p_song_id, 'restored', p_version,
    'Restaurado el contenido de la versión ' || p_version
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 8. reject_song  (+ evento 'rejected')
--    Se corrige: se elimina el update a song_files.status (columna
--    borrada en 0017).
-- ---------------------------------------------------------------------
create or replace function public.reject_song(p_song_id uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
  v_now    timestamptz := now();
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;
  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_notes is null or length(btrim(p_notes)) = 0 then
    raise exception 'review_notes required' using errcode = '23514';
  end if;

  select status into v_status from public.songs where id = p_song_id;
  if v_status is null then
    raise exception 'song not found' using errcode = 'P0002';
  end if;
  if v_status <> 'review' then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status       = 'rejected',
         reviewed_by  = v_uid,
         reviewed_at  = v_now,
         review_notes = p_notes
   where id = p_song_id;

  perform public.log_song_event(p_song_id, 'rejected', null, p_notes);
end;
$$;

-- ---------------------------------------------------------------------
-- 9. unpublish_song  (+ evento 'unpublished')
--    Se corrige: se elimina el update a song_files.status (columna
--    borrada en 0017).
-- ---------------------------------------------------------------------
create or replace function public.unpublish_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;
  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select status into v_status from public.songs where id = p_song_id for update;
  if not found then
    raise exception 'song not found' using errcode = 'P0002';
  end if;
  if v_status <> 'published' then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status       = 'draft',
         submitted_by = null,
         submitted_at = null,
         reviewed_by  = null,
         reviewed_at  = null,
         published_at = null,
         review_notes = null
   where id = p_song_id;

  perform public.log_song_event(p_song_id, 'unpublished');
end;
$$;

-- ---------------------------------------------------------------------
-- 10. archive_song  (+ evento 'archived')
-- ---------------------------------------------------------------------
create or replace function public.archive_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;
  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select status into v_status from public.songs where id = p_song_id;
  if v_status is null then
    raise exception 'song not found' using errcode = 'P0002';
  end if;
  if v_status = 'archived' then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status       = 'archived',
         number       = null,
         submitted_by = null,
         submitted_at = null,
         reviewed_by  = null,
         reviewed_at  = null,
         published_at = null,
         review_notes = null
   where id = p_song_id;

  perform public.log_song_event(p_song_id, 'archived');
end;
$$;

-- ---------------------------------------------------------------------
-- 11. unarchive_song  (+ evento 'unarchived')
-- ---------------------------------------------------------------------
create or replace function public.unarchive_song(p_song_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_status text;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;
  if not (public.is_editor() or public.is_admin()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select status into v_status from public.songs where id = p_song_id;
  if v_status is null then
    raise exception 'song not found' using errcode = 'P0002';
  end if;
  if v_status <> 'archived' then
    raise exception 'invalid transition from %', v_status using errcode = 'P0001';
  end if;

  update public.songs
     set status = 'draft'
   where id = p_song_id;

  perform public.log_song_event(p_song_id, 'unarchived');
end;
$$;

-- ---------------------------------------------------------------------
-- 12. create_blank_song  (+ evento 'created')
-- ---------------------------------------------------------------------
create or replace function public.create_blank_song(
  p_title text default 'Nuevo canto'
)
returns table(id uuid, number int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_number  int;
  v_id      uuid;
  v_slug    text;
begin
  if v_uid is null then
    raise exception 'auth required' using errcode = '42501';
  end if;
  if not (public.is_editor() or public.is_admin() or public.is_any_coordinator()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(7732190827356291101);

  select coalesce(max(s.number), 0) + 1
    into v_number
    from public.songs s;

  v_slug := 'nueva-cancion-' || extract(epoch from now())::bigint::text;

  insert into public.songs as s (title, slug, body, status, number, created_by)
  values (p_title, v_slug, '', 'draft', v_number, v_uid)
  returning s.id into v_id;

  perform public.log_song_event(v_id, 'created');

  return query select v_id, v_number;
end;
$$;

-- ---------------------------------------------------------------------
-- 13. get_song_events — bitácora con el nombre del actor resuelto.
-- ---------------------------------------------------------------------
create or replace function public.get_song_events(p_song_id uuid)
returns table (
  id            uuid,
  event         text,
  version       int,
  summary       text,
  actor_id      uuid,
  actor_name    text,
  created_at    timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.event,
    e.version,
    e.summary,
    e.actor_id,
    coalesce(u.display_name, u.email) as actor_name,
    e.created_at
  from public.song_events e
  left join public.users u on u.id = e.actor_id
  where e.song_id = p_song_id
  order by e.created_at desc, e.id desc;
$$;

-- ---------------------------------------------------------------------
-- 14. Backfill: un evento 'published' por cada versión ya existente.
--     Las canciones previas a esta migración no tienen evento 'created'
--     (no se registraba); su bitácora arranca en la primera publicación.
-- ---------------------------------------------------------------------
insert into public.song_events (song_id, event, version, summary, actor_id, created_at)
select
  sv.song_id,
  'published',
  sv.version,
  sv.change_summary,
  sv.reviewed_by,
  sv.published_at
from public.song_versions sv;

-- ---------------------------------------------------------------------
-- 15. Grants
-- ---------------------------------------------------------------------
grant execute on function public.log_song_event(uuid, text, int, text) to authenticated;
grant execute on function public.build_change_summary(uuid)            to authenticated;
grant execute on function public.get_song_events(uuid)                 to authenticated;

commit;
