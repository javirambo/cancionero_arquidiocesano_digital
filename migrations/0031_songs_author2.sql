-- Agrega un autor secundario opcional a las canciones.
-- Mantiene `author_id` como autor principal; `author2_id` es secundario.
-- Ambos pueden ser NULL.

alter table public.songs
  add column author2_id uuid references public.authors(id) on delete set null;

create index songs_author2_id_idx on public.songs(author2_id);
