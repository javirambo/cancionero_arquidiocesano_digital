-- =====================================================================
-- Cancionero Arquidiocesano Digital — Políticas RLS
-- Migración: 0002_rls_policies
-- Referencia: documentacion/casos_de_uso.md
--
-- Modelo de roles:
--   - admin        → todo
--   - editor       → modera contenido (review/publish/archive de songs/song_files)
--   - coordinator  → ABM de canciones en draft + ABM de playlists de su parroquia
--   - member       → usuario autenticado común
--   - anon         → visitante anónimo
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers de identidad y rol
-- Marcadas STABLE para permitir su uso en políticas y aprovechar caching
-- por statement.
-- ---------------------------------------------------------------------

create or replace function public.has_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = role_name
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$ select public.has_role('admin'); $$;

create or replace function public.is_editor()
returns boolean
language sql
stable
as $$ select public.has_role('editor') or public.has_role('admin'); $$;

create or replace function public.is_coordinator_of(parish uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parish_members pm
    where pm.user_id = auth.uid()
      and pm.parish_id = parish
      and pm.role = 'coordinator'
  );
$$;

create or replace function public.is_any_coordinator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parish_members pm
    where pm.user_id = auth.uid()
      and pm.role = 'coordinator'
  );
$$;

grant execute on function public.has_role(text)              to anon, authenticated;
grant execute on function public.is_admin()                  to anon, authenticated;
grant execute on function public.is_editor()                 to anon, authenticated;
grant execute on function public.is_coordinator_of(uuid)     to anon, authenticated;
grant execute on function public.is_any_coordinator()        to anon, authenticated;

-- =====================================================================
-- parishes
-- Lectura pública. Escritura: admin.
-- =====================================================================
create policy parishes_select_public
  on public.parishes for select
  using (is_active or public.is_editor());

create policy parishes_admin_all
  on public.parishes for all
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- authors / categories
-- Lectura pública. Escritura: editor o admin.
-- =====================================================================
create policy authors_select_public
  on public.authors for select using (true);
create policy authors_editor_write
  on public.authors for all
  using (public.is_editor())
  with check (public.is_editor());

create policy categories_select_public
  on public.categories for select using (true);
create policy categories_editor_write
  on public.categories for all
  using (public.is_editor())
  with check (public.is_editor());

-- =====================================================================
-- users
-- Cada usuario lee y edita su propio perfil. Admin lee/edita todo.
-- =====================================================================
create policy users_select_self
  on public.users for select
  using (id = auth.uid() or public.is_admin());

create policy users_update_self
  on public.users for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy users_admin_insert
  on public.users for insert
  with check (public.is_admin() or id = auth.uid());

create policy users_admin_delete
  on public.users for delete
  using (public.is_admin());

-- =====================================================================
-- songs (CU-01, CU-02, CU-16)
-- Lectura: published para todos; draft/review/rejected solo para
-- editor/admin o el coordinador que la creó.
-- Escritura: coordinador (su propio draft) + editor/admin.
-- =====================================================================
create policy songs_select_published
  on public.songs for select
  using (
    status = 'published'
    or public.is_editor()
    or (created_by = auth.uid() and status in ('draft','review','rejected'))
  );

-- Coordinador puede crear canciones (siempre arrancan en draft).
create policy songs_coordinator_insert
  on public.songs for insert
  with check (
    public.is_any_coordinator()
    and created_by = auth.uid()
    and status = 'draft'
  );

-- Coordinador edita sus propias canciones mientras estén en draft o
-- rejected (puede reenviar a review). No puede tocar review/published/archived.
create policy songs_coordinator_update
  on public.songs for update
  using (
    created_by = auth.uid()
    and status in ('draft','rejected','review')
    and public.is_any_coordinator()
  )
  with check (
    created_by = auth.uid()
    and status in ('draft','review')
  );

-- Editor / admin: control total.
create policy songs_editor_all
  on public.songs for all
  using (public.is_editor())
  with check (public.is_editor());

-- =====================================================================
-- song_versions
-- Histórico inmutable. Lectura pública (refleja contenido publicado).
-- Inserción: solo editor/admin (lo hace el flujo de aprobación).
-- =====================================================================
create policy song_versions_select_public
  on public.song_versions for select using (true);

create policy song_versions_editor_insert
  on public.song_versions for insert
  with check (public.is_editor());

-- No update / no delete (intencionalmente sin policy → bloqueado).

-- =====================================================================
-- song_files (CU-09, CU-16)
-- Lectura pública solo si status = 'published'.
-- Drafts/review visibles para editor/admin o el coordinador que subió.
-- Escritura: coordinador sobre archivos de sus propias songs en draft;
-- editor/admin total.
-- =====================================================================
create policy song_files_select_published
  on public.song_files for select
  using (
    status = 'published'
    or public.is_editor()
    or uploaded_by = auth.uid()
  );

create policy song_files_coordinator_insert
  on public.song_files for insert
  with check (
    public.is_any_coordinator()
    and uploaded_by = auth.uid()
    and status = 'draft'
    and exists (
      select 1 from public.songs s
      where s.id = song_id
        and s.created_by = auth.uid()
        and s.status in ('draft','rejected','review')
    )
  );

create policy song_files_coordinator_update
  on public.song_files for update
  using (
    uploaded_by = auth.uid()
    and status in ('draft','rejected','review')
    and public.is_any_coordinator()
  )
  with check (
    uploaded_by = auth.uid()
    and status in ('draft','review')
  );

create policy song_files_coordinator_delete
  on public.song_files for delete
  using (
    uploaded_by = auth.uid()
    and status in ('draft','rejected')
  );

create policy song_files_editor_all
  on public.song_files for all
  using (public.is_editor())
  with check (public.is_editor());

-- =====================================================================
-- playlists (CU-05, CU-17)
-- Lectura: 'public' visible para todos; 'unlisted' solo si conocés el id
-- (RLS no lo restringe — son enumerables solo si se listan); 'private'
-- solo el coordinador de la parroquia y editor/admin.
-- Escritura: coordinador de la parroquia + editor/admin.
-- =====================================================================
create policy playlists_select
  on public.playlists for select
  using (
    visibility in ('public','unlisted')
    or public.is_editor()
    or public.is_coordinator_of(parish_id)
  );

create policy playlists_coordinator_insert
  on public.playlists for insert
  with check (
    public.is_coordinator_of(parish_id)
    and created_by = auth.uid()
  );

create policy playlists_coordinator_update
  on public.playlists for update
  using (public.is_coordinator_of(parish_id) or public.is_editor())
  with check (public.is_coordinator_of(parish_id) or public.is_editor());

create policy playlists_coordinator_delete
  on public.playlists for delete
  using (public.is_coordinator_of(parish_id) or public.is_editor());

-- =====================================================================
-- playlist_songs (CU-05, CU-17)
-- Visibilidad heredada de la playlist. Escritura del coordinador de la
-- parroquia dueña de la playlist.
-- =====================================================================
create policy playlist_songs_select
  on public.playlist_songs for select
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (
          p.visibility in ('public','unlisted')
          or public.is_editor()
          or public.is_coordinator_of(p.parish_id)
        )
    )
  );

create policy playlist_songs_coordinator_write
  on public.playlist_songs for all
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (public.is_coordinator_of(p.parish_id) or public.is_editor())
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and (public.is_coordinator_of(p.parish_id) or public.is_editor())
    )
  );

-- =====================================================================
-- liturgical_events / featured_content (CU-07)
-- Lectura pública. Escritura: admin.
-- =====================================================================
create policy liturgical_events_select_public
  on public.liturgical_events for select using (true);
create policy liturgical_events_admin_all
  on public.liturgical_events for all
  using (public.is_admin())
  with check (public.is_admin());

create policy featured_content_select_public
  on public.featured_content for select
  using (is_active or public.is_admin());
create policy featured_content_admin_all
  on public.featured_content for all
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- settings
-- Lectura pública (flags / textos institucionales). Escritura: admin.
-- =====================================================================
create policy settings_select_public
  on public.settings for select using (true);
create policy settings_admin_all
  on public.settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- roles / permissions / role_permissions (CU-20)
-- Lectura: cualquier autenticado (las funciones helpers las consultan).
-- Escritura: admin.
-- =====================================================================
create policy roles_select_authenticated
  on public.roles for select
  using (auth.uid() is not null);
create policy roles_admin_all
  on public.roles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy permissions_select_authenticated
  on public.permissions for select
  using (auth.uid() is not null);
create policy permissions_admin_all
  on public.permissions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy role_permissions_select_authenticated
  on public.role_permissions for select
  using (auth.uid() is not null);
create policy role_permissions_admin_all
  on public.role_permissions for all
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- user_roles (CU-18, CU-20)
-- Lectura: el propio usuario o admin.
-- Escritura: admin.
-- =====================================================================
create policy user_roles_select_self
  on public.user_roles for select
  using (user_id = auth.uid() or public.is_admin());

create policy user_roles_admin_all
  on public.user_roles for all
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- parish_members (CU-14, CU-17)
-- Lectura: cualquiera puede ver miembros de una parroquia (transparencia).
-- Inserción: el propio usuario puede vincularse como 'member'.
-- Coordinador / admin: gestionan roles dentro de su parroquia.
-- =====================================================================
create policy parish_members_select_public
  on public.parish_members for select using (true);

-- Auto-vinculación como member.
create policy parish_members_self_join
  on public.parish_members for insert
  with check (
    user_id = auth.uid()
    and role = 'member'
  );

-- Auto-baja: el usuario puede salir de la parroquia.
create policy parish_members_self_leave
  on public.parish_members for delete
  using (user_id = auth.uid() and role = 'member');

-- Coordinador/admin gestionan roles en su parroquia.
create policy parish_members_coordinator_manage
  on public.parish_members for all
  using (public.is_coordinator_of(parish_id) or public.is_admin())
  with check (public.is_coordinator_of(parish_id) or public.is_admin());

-- =====================================================================
-- favorites (CU-15, CU-22)
-- Cada usuario gestiona sus propios favoritos. Lectura agregada
-- (conteos) se hace vía vista server-side, no por RLS de cliente.
-- =====================================================================
create policy favorites_select_self
  on public.favorites for select
  using (user_id = auth.uid() or public.is_admin());

create policy favorites_insert_self
  on public.favorites for insert
  with check (user_id = auth.uid());

create policy favorites_delete_self
  on public.favorites for delete
  using (user_id = auth.uid());

-- =====================================================================
-- user_song_keys (CU-03)
-- Privadas del usuario.
-- =====================================================================
create policy user_song_keys_select_self
  on public.user_song_keys for select
  using (user_id = auth.uid());

create policy user_song_keys_upsert_self
  on public.user_song_keys for insert
  with check (user_id = auth.uid());

create policy user_song_keys_update_self
  on public.user_song_keys for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_song_keys_delete_self
  on public.user_song_keys for delete
  using (user_id = auth.uid());

-- =====================================================================
-- announcements (CU-21)
-- Lectura pública: anuncios activos en su ventana de vigencia.
-- Escritura: admin (global) o coordinador de la parroquia (scope=parish).
-- =====================================================================
create policy announcements_select_public
  on public.announcements for select
  using (
    (is_active and now() between starts_at and ends_at)
    or public.is_admin()
    or (scope = 'parish' and parish_id is not null and public.is_coordinator_of(parish_id))
  );

create policy announcements_admin_all
  on public.announcements for all
  using (public.is_admin())
  with check (public.is_admin());

create policy announcements_coordinator_parish
  on public.announcements for all
  using (
    scope = 'parish'
    and parish_id is not null
    and public.is_coordinator_of(parish_id)
  )
  with check (
    scope = 'parish'
    and parish_id is not null
    and public.is_coordinator_of(parish_id)
  );

-- =====================================================================
-- announcement_dismissals (CU-21)
-- Cada usuario gestiona sus propios cierres. Anónimos por device_id:
-- se permite insert sin auth (RLS no puede validar el device, se confía
-- en que el cliente provea uno; protección efectiva por unicidad).
-- =====================================================================
create policy announcement_dismissals_select_self
  on public.announcement_dismissals for select
  using (
    (user_id is not null and user_id = auth.uid())
    or (user_id is null)
    or public.is_admin()
  );

create policy announcement_dismissals_insert
  on public.announcement_dismissals for insert
  with check (
    (user_id = auth.uid())
    or (user_id is null and device_id is not null)
  );

create policy announcement_dismissals_delete_self
  on public.announcement_dismissals for delete
  using (
    (user_id is not null and user_id = auth.uid())
    or public.is_admin()
  );

-- =====================================================================
-- Seed inicial de roles y permisos (CU-20)
-- =====================================================================
insert into public.roles (name, description) values
  ('admin',       'Administrador del sistema (acceso total)'),
  ('editor',      'Editor de contenido (Comisión Litúrgico-Musical)'),
  ('coordinator', 'Coordinador parroquial'),
  ('member',      'Usuario autenticado común')
on conflict (name) do nothing;

insert into public.permissions (code, description) values
  ('song.create',       'Crear canciones (en draft)'),
  ('song.edit',         'Editar canciones'),
  ('song.review',       'Aprobar/rechazar canciones en revisión'),
  ('song.archive',      'Archivar canciones (baja lógica)'),
  ('playlist.create',   'Crear playlists'),
  ('playlist.edit',     'Editar playlists'),
  ('parish.manage',     'ABM de parroquias'),
  ('user.manage',       'ABM de usuarios y asignación de roles'),
  ('announcement.global', 'Crear anuncios globales'),
  ('announcement.parish', 'Crear anuncios de parroquia')
on conflict (code) do nothing;

-- Asignación rol → permisos
with role_perm as (
  select r.id as role_id, p.id as permission_id
  from public.roles r
  cross join public.permissions p
  where
    -- admin: todo
    (r.name = 'admin')
    -- editor: gestiona songs y anuncios globales
    or (r.name = 'editor' and p.code in (
      'song.create','song.edit','song.review','song.archive',
      'announcement.global'
    ))
    -- coordinator: songs en draft, playlists y anuncios de parroquia
    or (r.name = 'coordinator' and p.code in (
      'song.create','song.edit',
      'playlist.create','playlist.edit',
      'announcement.parish'
    ))
)
insert into public.role_permissions (role_id, permission_id)
select role_id, permission_id from role_perm
on conflict do nothing;
