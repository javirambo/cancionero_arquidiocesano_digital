-- Persistencia por (usuario, canción) del tono elegido (en semitonos)
-- para sincronizar la transposición entre dispositivos del usuario logueado.
-- Los anónimos siguen usando localStorage del navegador.

create table if not exists public.user_song_keys (
  user_id uuid not null,
  song_id uuid not null,
  semitones integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  constraint user_song_keys_pkey primary key (user_id, song_id),
  constraint user_song_keys_song_id_fkey foreign key (song_id) references public.songs (id) on delete cascade,
  constraint user_song_keys_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade
) tablespace pg_default;

create index if not exists user_song_keys_user_id_idx on public.user_song_keys using btree (user_id) tablespace pg_default;
create index if not exists user_song_keys_song_id_idx on public.user_song_keys using btree (song_id) tablespace pg_default;

drop trigger if exists user_song_keys_set_updated_at on public.user_song_keys;
create trigger user_song_keys_set_updated_at before update on public.user_song_keys
  for each row execute function set_updated_at();

-- RLS: cada usuario sólo puede ver/escribir sus propias filas.
alter table public.user_song_keys enable row level security;

drop policy if exists user_song_keys_select_own on public.user_song_keys;
create policy user_song_keys_select_own
  on public.user_song_keys
  for select
  using (auth.uid() = user_id);

drop policy if exists user_song_keys_insert_own on public.user_song_keys;
create policy user_song_keys_insert_own
  on public.user_song_keys
  for insert
  with check (auth.uid() = user_id);

drop policy if exists user_song_keys_update_own on public.user_song_keys;
create policy user_song_keys_update_own
  on public.user_song_keys
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists user_song_keys_delete_own on public.user_song_keys;
create policy user_song_keys_delete_own
  on public.user_song_keys
  for delete
  using (auth.uid() = user_id);
