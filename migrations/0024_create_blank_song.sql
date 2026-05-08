-- =====================================================================
-- Cancionero Arquidiocesano Digital — Alta de canción con próximo número
-- Migración: 0024_create_blank_song
--
-- Contexto:
--   Hasta ahora, "+ Nueva canción" insertaba con `number = NULL` y el
--   coordinador/editor debía completarlo a mano. Pedido: que el sistema
--   asigne automáticamente el próximo número disponible (max + 1) y no
--   reuse huecos (canciones archivadas o borradas no liberan su número).
--
--   Riesgo de carrera: dos usuarios creando simultáneamente podrían
--   resolver el mismo `max + 1` y violar `songs_number_unique`. Se
--   resuelve con `pg_advisory_xact_lock(<key>)` antes de calcular el
--   max — la primera transacción avanza, la segunda espera y obtiene
--   un max ya actualizado.
--
-- Diseño:
--   - create_blank_song(p_title text default 'Nuevo canto') returns
--     table(id uuid, number int).
--   - Permitido para editor/admin/coordinator (mismos que pueden crear
--     canciones según las RLS de songs).
--   - Slug: `nueva-cancion-<epoch_ms>` (igual que la lógica anterior),
--     único por construcción.
--   - status = 'draft'; created_by = auth.uid().
--   - Cálculo de número: max(number) sobre TODOS los status (incluso
--     archived), + 1. Si no hay canciones, empieza en 1.
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

  -- Lock cooperativo para evitar carrera con max+1. Clave fija (hash del
  -- nombre 'songs.next_number'). Se libera al cerrar la transacción.
  perform pg_advisory_xact_lock(7732190827356291101);

  select coalesce(max(number), 0) + 1 into v_number from public.songs;

  v_slug := 'nueva-cancion-' || extract(epoch from now())::bigint::text;

  insert into public.songs (title, slug, body, status, number, created_by)
  values (p_title, v_slug, '', 'draft', v_number, v_uid)
  returning songs.id into v_id;

  return query select v_id, v_number;
end;
$$;

grant execute on function public.create_blank_song(text) to authenticated;
