-- =====================================================================
-- Cancionero Arquidiocesano Digital — Fix ambigüedad en create_blank_song
-- Migración: 0030_fix_create_blank_song_ambiguous_number
--
-- Contexto:
--   La 0024 declaraba `returns table(id uuid, number int)` y dentro del
--   cuerpo hacía `select coalesce(max(number), 0) + 1 from public.songs`.
--   Postgres considera ambiguo el identificador `number`: puede ser la
--   columna de la tabla de salida del RPC o la columna `songs.number`.
--   Al ejecutar la función falla con:
--     "column reference "number" is ambiguous".
--
-- Fix:
--   Recrear la función calificando todas las referencias a la columna
--   de la tabla `songs` (alias `s.number`) y del INSERT. Se mantiene la
--   firma de retorno `(id, number)` para no tocar el cliente.
--   Como la firma de retorno no cambia, basta `create or replace`.
-- =====================================================================

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

  return query select v_id, v_number;
end;
$$;

grant execute on function public.create_blank_song(text) to authenticated;
