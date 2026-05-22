-- =====================================================================
-- Cancionero Arquidiocesano Digital — Fix build_change_summary: array literal
-- Migración: 0047_fix_build_change_summary_array
-- =====================================================================
--
-- Contexto:
--   `build_change_summary` (mig. 0045) acumula los campos modificados en
--   un `text[]` con la expresión `parts := parts || 'campo'`. PostgreSQL
--   interpreta el operando derecho como un array literal, no como un
--   elemento de texto, y falla con:
--     malformed array literal: "tono"
--   El error aparece al ejecutar `approve_song`,
--   `save_published_song_version` o `log_song_edit`.
--
-- Cambio:
--   Recrear `build_change_summary` usando `array_append(parts, 'campo')`,
--   que sí agrega un elemento al array. Misma lógica que 0045.
-- =====================================================================

begin;

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
    parts := array_append(parts, 'título');
  end if;
  if coalesce(s.body, '') is distinct from coalesce(prev.body, '') then
    parts := array_append(parts, 'letra');
  end if;
  if coalesce(s.original_key, '') is distinct from coalesce(prev.original_key, '') then
    parts := array_append(parts, 'tono');
  end if;
  if coalesce(s.tempo_bpm, -1) is distinct from coalesce(prev.tempo_bpm, -1) then
    parts := array_append(parts, 'tempo');
  end if;
  if coalesce(s.youtube_url, '') is distinct from coalesce(prev.youtube_url, '') then
    parts := array_append(parts, 'video');
  end if;
  if s.author_id is distinct from prev.author_id then
    parts := array_append(parts, 'autor');
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
    parts := array_append(parts, 'categorías');
  end if;

  if array_length(parts, 1) is null then
    return 'Sin cambios de contenido';
  end if;
  return 'Cambió ' || array_to_string(parts, ', ');
end;
$$;

commit;
