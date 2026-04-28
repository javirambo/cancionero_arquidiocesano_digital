-- =====================================================================
-- Cancionero Arquidiocesano Digital — Esquema inicial
-- Migración: 0001_initial_schema
-- Referencia: documentacion/modelo_de_datos.md
-- Target: Supabase (PostgreSQL)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- búsqueda por similitud
create extension if not exists "unaccent";   -- normalización para FTS

-- ---------------------------------------------------------------------
-- Helper: trigger genérico para mantener updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- FASE 1
-- =====================================================================

-- ---------------------------------------------------------------------
-- parishes
-- ---------------------------------------------------------------------
create table public.parishes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  address     text,
  city        text,
  phone       text,
  email       text,
  description text,
  logo_url    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index parishes_name_idx on public.parishes using gin (name gin_trgm_ops);
create trigger parishes_set_updated_at
  before update on public.parishes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- authors
-- ---------------------------------------------------------------------
create table public.authors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  bio        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger authors_set_updated_at
  before update on public.authors
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- users  (perfil aplicativo, extiende auth.users)
-- Se crea acá (Fase 2 en el modelo) por ser FK de songs/playlists/etc.
-- ---------------------------------------------------------------------
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  display_name text,
  avatar_url   text,
  parish_id    uuid references public.parishes(id) on delete set null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index users_parish_id_idx on public.users(parish_id);
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- songs
-- ---------------------------------------------------------------------
create table public.songs (
  id              uuid primary key default gen_random_uuid(),
  number          int,
  title           text not null,
  slug            text not null unique,
  author_id       uuid references public.authors(id) on delete set null,
  category_id     uuid references public.categories(id) on delete set null,
  body            text not null,
  original_key    text,
  tempo_bpm       int,
  tags            text[] not null default '{}',
  youtube_url     text,
  status          text not null default 'draft'
                  check (status in ('draft','review','published','rejected','archived')),
  current_version int not null default 1,
  created_by      uuid references public.users(id) on delete set null,
  submitted_by    uuid references public.users(id) on delete set null,
  submitted_at    timestamptz,
  reviewed_by     uuid references public.users(id) on delete set null,
  reviewed_at     timestamptz,
  review_notes    text,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint songs_review_notes_required
    check (status <> 'rejected' or (review_notes is not null and length(btrim(review_notes)) > 0))
);
create unique index songs_number_unique on public.songs(number) where number is not null;
create index songs_title_trgm_idx    on public.songs using gin (title gin_trgm_ops);
create index songs_body_trgm_idx     on public.songs using gin (body gin_trgm_ops);
create index songs_category_id_idx   on public.songs(category_id);
create index songs_author_id_idx     on public.songs(author_id);
create index songs_status_idx        on public.songs(status);
create index songs_fts_idx on public.songs
  using gin (to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(body,'')));
create trigger songs_set_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- song_versions
-- ---------------------------------------------------------------------
create table public.song_versions (
  id             uuid not null default gen_random_uuid(),
  song_id        uuid not null references public.songs(id) on delete cascade,
  version        int  not null,
  title          text not null,
  body           text not null,
  original_key   text,
  tempo_bpm      int,
  tags           text[] not null default '{}',
  youtube_url    text,
  author_id      uuid references public.authors(id) on delete set null,
  category_id    uuid references public.categories(id) on delete set null,
  change_summary text,
  submitted_by   uuid references public.users(id) on delete set null,
  reviewed_by    uuid references public.users(id) on delete set null,
  published_at   timestamptz not null,
  created_at     timestamptz not null default now(),
  primary key (song_id, version)
);
create index song_versions_song_version_desc_idx
  on public.song_versions(song_id, version desc);

-- ---------------------------------------------------------------------
-- song_files
-- ---------------------------------------------------------------------
create table public.song_files (
  id            uuid primary key default gen_random_uuid(),
  song_id       uuid not null references public.songs(id) on delete cascade,
  kind          text not null
                check (kind in ('score_pdf','audio_mp3','audio_ogg','other')),
  bucket        text not null,
  path          text not null,
  label         text,
  is_primary    boolean not null default false,
  size_bytes    bigint,
  status        text not null default 'draft'
                check (status in ('draft','review','published','rejected','archived')),
  uploaded_by   uuid references public.users(id) on delete set null,
  submitted_by  uuid references public.users(id) on delete set null,
  submitted_at  timestamptz,
  reviewed_by   uuid references public.users(id) on delete set null,
  reviewed_at   timestamptz,
  review_notes  text,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index song_files_song_id_idx       on public.song_files(song_id);
create index song_files_song_kind_idx     on public.song_files(song_id, kind);
create index song_files_status_idx        on public.song_files(status);
-- Solo un archivo primario por (song_id, kind)
create unique index song_files_primary_unique
  on public.song_files(song_id, kind)
  where is_primary;

-- ---------------------------------------------------------------------
-- playlists
-- ---------------------------------------------------------------------
create table public.playlists (
  id          uuid primary key default gen_random_uuid(),
  parish_id   uuid not null references public.parishes(id) on delete cascade,
  slug        text not null,
  name        text not null,
  description text,
  event_date  date,
  visibility  text not null default 'public'
              check (visibility in ('public','unlisted','private')),
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (parish_id, slug)
);
create index playlists_parish_id_idx  on public.playlists(parish_id);
create index playlists_event_date_idx on public.playlists(event_date);
create trigger playlists_set_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- playlist_songs
-- ---------------------------------------------------------------------
create table public.playlist_songs (
  playlist_id  uuid not null references public.playlists(id) on delete cascade,
  song_id      uuid not null references public.songs(id) on delete restrict,
  position     int  not null,
  note         text,
  key_override text,
  created_at   timestamptz not null default now(),
  primary key (playlist_id, song_id, position)
);
create index playlist_songs_position_idx on public.playlist_songs(playlist_id, position);

-- ---------------------------------------------------------------------
-- liturgical_events
-- ---------------------------------------------------------------------
create table public.liturgical_events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  event_date  date not null,
  kind        text not null
              check (kind in ('solemnidad','fiesta','memoria','tiempo','otro')),
  playlist_id uuid references public.playlists(id) on delete set null,
  description text,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index liturgical_events_event_date_idx on public.liturgical_events(event_date);

-- ---------------------------------------------------------------------
-- featured_content
-- ---------------------------------------------------------------------
create table public.featured_content (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text,
  target_kind text not null
              check (target_kind in ('song','playlist','parish','external','none')),
  target_id   uuid,
  target_url  text,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  priority    int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  check (ends_at > starts_at),
  check (
    (target_kind = 'external' and target_url is not null)
    or (target_kind in ('song','playlist','parish') and target_id is not null)
    or (target_kind = 'none')
  )
);
create index featured_content_window_idx on public.featured_content(starts_at, ends_at);

-- ---------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------
create table public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- FASE 2
-- =====================================================================

-- ---------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text
);

-- ---------------------------------------------------------------------
-- permissions
-- ---------------------------------------------------------------------
create table public.permissions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  description text
);

-- ---------------------------------------------------------------------
-- role_permissions
-- ---------------------------------------------------------------------
create table public.role_permissions (
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ---------------------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------------------
create table public.user_roles (
  user_id    uuid not null references public.users(id) on delete cascade,
  role_id    uuid not null references public.roles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- ---------------------------------------------------------------------
-- parish_members
-- ---------------------------------------------------------------------
create table public.parish_members (
  user_id   uuid not null references public.users(id) on delete cascade,
  parish_id uuid not null references public.parishes(id) on delete cascade,
  role      text not null default 'member'
            check (role in ('coordinator','member')),
  joined_at timestamptz not null default now(),
  primary key (user_id, parish_id)
);
create index parish_members_parish_id_idx on public.parish_members(parish_id);

-- ---------------------------------------------------------------------
-- favorites  (polimórfico: song / playlist / parish)
-- ---------------------------------------------------------------------
create table public.favorites (
  user_id     uuid not null references public.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('song','playlist','parish')),
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, target_kind, target_id)
);
create index favorites_target_idx on public.favorites(target_kind, target_id);

-- Validación de integridad referencial polimórfica vía trigger
create or replace function public.favorites_validate_target()
returns trigger
language plpgsql
as $$
begin
  if new.target_kind = 'song' then
    if not exists (select 1 from public.songs where id = new.target_id) then
      raise exception 'favorites.target_id % no existe en songs', new.target_id;
    end if;
  elsif new.target_kind = 'playlist' then
    if not exists (select 1 from public.playlists where id = new.target_id) then
      raise exception 'favorites.target_id % no existe en playlists', new.target_id;
    end if;
  elsif new.target_kind = 'parish' then
    if not exists (select 1 from public.parishes where id = new.target_id) then
      raise exception 'favorites.target_id % no existe en parishes', new.target_id;
    end if;
  end if;
  return new;
end;
$$;
create trigger favorites_validate_target_trg
  before insert or update on public.favorites
  for each row execute function public.favorites_validate_target();

-- ---------------------------------------------------------------------
-- user_song_keys
-- ---------------------------------------------------------------------
create table public.user_song_keys (
  user_id    uuid not null references public.users(id) on delete cascade,
  song_id    uuid not null references public.songs(id) on delete cascade,
  key        text,
  semitones  int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, song_id)
);
create index user_song_keys_user_id_idx on public.user_song_keys(user_id);
create index user_song_keys_song_id_idx on public.user_song_keys(song_id);
create trigger user_song_keys_set_updated_at
  before update on public.user_song_keys
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  scope      text not null default 'global'
             check (scope in ('global','parish')),
  parish_id  uuid references public.parishes(id) on delete cascade,
  priority   int not null default 0,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  is_active  boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (
    (scope = 'global'  and parish_id is null) or
    (scope = 'parish'  and parish_id is not null)
  )
);
create index announcements_window_idx    on public.announcements(starts_at, ends_at);
create index announcements_parish_id_idx on public.announcements(parish_id);

-- ---------------------------------------------------------------------
-- announcement_dismissals
-- ---------------------------------------------------------------------
create table public.announcement_dismissals (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id         uuid references public.users(id) on delete cascade,
  device_id       text,
  dismissed_at    timestamptz not null default now(),
  check (user_id is not null or device_id is not null)
);
-- Unicidad por (announcement, user) y por (announcement, device)
create unique index announcement_dismissals_user_unique
  on public.announcement_dismissals(announcement_id, user_id)
  where user_id is not null;
create unique index announcement_dismissals_device_unique
  on public.announcement_dismissals(announcement_id, device_id)
  where user_id is null and device_id is not null;

-- =====================================================================
-- Trigger: alta automática de perfil en public.users al crear auth.users
-- =====================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =====================================================================
-- Habilitar Row Level Security
-- (políticas concretas se definirán en una migración posterior)
-- =====================================================================
alter table public.parishes               enable row level security;
alter table public.authors                enable row level security;
alter table public.categories             enable row level security;
alter table public.users                  enable row level security;
alter table public.songs                  enable row level security;
alter table public.song_versions          enable row level security;
alter table public.song_files             enable row level security;
alter table public.playlists              enable row level security;
alter table public.playlist_songs         enable row level security;
alter table public.liturgical_events      enable row level security;
alter table public.featured_content       enable row level security;
alter table public.settings               enable row level security;
alter table public.roles                  enable row level security;
alter table public.permissions            enable row level security;
alter table public.role_permissions       enable row level security;
alter table public.user_roles             enable row level security;
alter table public.parish_members         enable row level security;
alter table public.favorites              enable row level security;
alter table public.user_song_keys         enable row level security;
alter table public.announcements          enable row level security;
alter table public.announcement_dismissals enable row level security;
