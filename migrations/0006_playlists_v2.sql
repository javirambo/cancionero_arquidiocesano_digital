-- =====================================================================
-- Cancionero Arquidiocesano Digital — Playlists modelo "estilo Spotify"
-- Migración: 0006_playlists_v2
-- Referencia: documentacion/casos_de_uso.md (CU-17)
--
-- Cambios:
--   1. URL canónica de playlists pasa a ser /playlists/{id} (UUID).
--      El campo `slug` deja de ser único por parroquia (queda como texto
--      libre, ya no se usa en URL).
--   2. Nueva columna `playlists.is_archdiocesan` para playlists creadas
--      por la parroquia "Arquidiócesis" que se ven por defecto en todas
--      las parroquias.
--   3. Nueva tabla `playlist_parish_subscriptions` para que una parroquia
--      "adopte" una playlist creada por otra.
--   4. RLS actualizadas para soportar el nuevo modelo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Quitar UNIQUE(parish_id, slug) ya que slug deja de ser identificador
-- ---------------------------------------------------------------------
alter table public.playlists
  drop constraint if exists playlists_parish_id_slug_key;

-- El slug pasa a ser opcional (puede quedar vacío en playlists nuevas).
alter table public.playlists
  alter column slug drop not null;

-- ---------------------------------------------------------------------
-- 2. Columna is_archdiocesan
-- ---------------------------------------------------------------------
alter table public.playlists
  add column if not exists is_archdiocesan boolean not null default false;

create index if not exists playlists_archdiocesan_idx
  on public.playlists(is_archdiocesan)
  where is_archdiocesan;

-- ---------------------------------------------------------------------
-- 3. playlist_parish_subscriptions
-- ---------------------------------------------------------------------
create table if not exists public.playlist_parish_subscriptions (
  playlist_id     uuid not null references public.playlists(id) on delete cascade,
  parish_id       uuid not null references public.parishes(id) on delete cascade,
  subscribed_by   uuid references public.users(id) on delete set null,
  subscribed_at   timestamptz not null default now(),
  primary key (playlist_id, parish_id)
);

create index if not exists playlist_parish_subscriptions_parish_idx
  on public.playlist_parish_subscriptions(parish_id);

alter table public.playlist_parish_subscriptions enable row level security;

-- Lectura pública: cualquiera puede ver qué playlists adoptó qué parroquia,
-- igual que las playlists públicas son visibles.
create policy playlist_subs_select_public
  on public.playlist_parish_subscriptions for select
  using (true);

-- Inserción: coordinador de la parroquia que se suscribe, o admin.
create policy playlist_subs_coordinator_insert
  on public.playlist_parish_subscriptions for insert
  with check (
    public.is_admin()
    or public.is_coordinator_of(parish_id)
  );

-- Eliminación (desuscribir): coordinador de la parroquia o admin.
create policy playlist_subs_coordinator_delete
  on public.playlist_parish_subscriptions for delete
  using (
    public.is_admin()
    or public.is_coordinator_of(parish_id)
  );

-- ---------------------------------------------------------------------
-- 4. Ajustar policies de playlists para nuevo modelo
--    - SELECT: igual que antes (public/unlisted/coord/editor) pero
--      también las archidiocesanas son visibles para cualquiera.
--    - INSERT/UPDATE/DELETE: dueño (coordinator de parish_id) o admin.
-- ---------------------------------------------------------------------
drop policy if exists playlists_select on public.playlists;
create policy playlists_select
  on public.playlists for select
  using (
    visibility in ('public','unlisted')
    or is_archdiocesan
    or public.is_editor()
    or public.is_coordinator_of(parish_id)
  );

-- Reemplazar las de coordinator por versiones que también admiten admin.
drop policy if exists playlists_coordinator_insert on public.playlists;
create policy playlists_insert
  on public.playlists for insert
  with check (
    public.is_admin()
    or (public.is_coordinator_of(parish_id) and created_by = auth.uid())
  );

drop policy if exists playlists_coordinator_update on public.playlists;
create policy playlists_update
  on public.playlists for update
  using (public.is_admin() or public.is_coordinator_of(parish_id))
  with check (public.is_admin() or public.is_coordinator_of(parish_id));

drop policy if exists playlists_coordinator_delete on public.playlists;
create policy playlists_delete
  on public.playlists for delete
  using (public.is_admin() or public.is_coordinator_of(parish_id));

-- También hace falta que admin pueda gestionar playlist_songs.
-- La policy actual solo permite a coordinator. Reemplazamos.
drop policy if exists playlist_songs_coordinator_write on public.playlist_songs;
create policy playlist_songs_write
  on public.playlist_songs for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (public.is_coordinator_of(p.parish_id) or public.is_editor())
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (public.is_coordinator_of(p.parish_id) or public.is_editor())
    )
  );

-- ---------------------------------------------------------------------
-- 5. Crear/asegurar parroquia virtual "Arquidiócesis"
-- ---------------------------------------------------------------------
insert into public.parishes (name, slug, description, is_active)
values (
  'Arquidiócesis de Rosario',
  'arquidiocesis',
  'Playlists oficiales y propuestas litúrgicas de la Arquidiócesis. Visibles por defecto en todas las parroquias.',
  true
)
on conflict (slug) do nothing;
