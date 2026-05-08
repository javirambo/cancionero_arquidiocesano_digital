-- =====================================================================
-- Cancionero Arquidiocesano Digital — Fix approve_song: remover update a song_files.status
-- Migración: 0025_fix_approve_song_song_files_status
-- =====================================================================
--
-- Contexto:
--   La migración 0017_song_files_remove_status eliminó la columna
--   `public.song_files.status` y todo el workflow editorial sobre
--   song_files (delegando en `songs.status` vía policies).
--
--   Sin embargo, la migración 0021_songs_multi_category_drop_tags
--   recreó `approve_song` para snapshotear categorías al publicar y, en
--   ese mismo CREATE OR REPLACE, re-introdujo accidentalmente un
--   `update public.song_files set status = 'published' ... where status = 'review'`,
--   referenciando una columna que ya no existe.
--
--   PostgreSQL no valida cuerpos de funciones plpgsql al crearlas, por
--   eso el error "column 'status' does not exist" recién aparece al
--   ejecutar la RPC (botón "Aprobar y publicar" en /admin/canciones).
--
-- Cambios:
--   1. Recrear `public.approve_song(uuid)` con la misma lógica que 0021
--      pero SIN tocar `public.song_files`.
-- =====================================================================

begin;

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
end;
$$;

commit;
