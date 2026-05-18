-- =====================================================================
-- Cancionero Arquidiocesano Digital — Coordinator: subir imágenes y crear anuncios
-- Migración: 0041_coordinator_uploads_and_announcements
--
-- Restaura el permiso del rol `coordinator` para:
--   1) Subir/actualizar/borrar imágenes de cards en el bucket `images`.
--   2) Crear / editar / eliminar anuncios scoped a sus parroquias.
--
-- Contexto:
--   La mig. 0023 ya contemplaba (1) con `is_editor() OR is_any_coordinator()`,
--   pero las policies de `storage.objects` vigentes en la DB quedaron
--   restringidas a `is_editor()`, bloqueando al coordinator con
--   "new row violates row-level security policy".
--
--   La policy `announcements_coordinator_all` (mig. 0013) usaba
--   `is_coordinator_of_announcement(id)` también para INSERT. En el
--   momento del INSERT todavía no existen filas en `announcement_parishes`,
--   así que el chequeo evalúa false y rechaza la creación.
--
-- Cambios:
--   - images_insert: vuelve a incluir `is_any_coordinator()`.
--   - images_update / images_delete: permiten al dueño del objeto (coordinator que lo subió).
--   - announcements_coordinator_all: se elimina y se reemplaza por tres
--     policies separadas:
--       * insert: cualquier coordinator (`is_any_coordinator()`). El destino
--         real lo restringe la policy de `announcement_parishes`.
--       * update / delete: solo si el anuncio ya está linkeado a una
--         parroquia donde el user es coordinator
--         (`is_coordinator_of_announcement(id)`).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Storage: bucket `images`
-- ---------------------------------------------------------------------
drop policy if exists images_insert on storage.objects;
create policy images_insert
  on storage.objects for insert
  with check (
    bucket_id = 'images'
    and auth.uid() is not null
    and owner = auth.uid()
    and (
      public.is_editor()
      or public.is_any_coordinator()
    )
  );

drop policy if exists images_update on storage.objects;
create policy images_update
  on storage.objects for update
  using (
    bucket_id = 'images'
    and (
      public.is_editor()
      or owner = auth.uid()
    )
  )
  with check (
    bucket_id = 'images'
    and (
      public.is_editor()
      or owner = auth.uid()
    )
  );

drop policy if exists images_delete on storage.objects;
create policy images_delete
  on storage.objects for delete
  using (
    bucket_id = 'images'
    and (
      public.is_editor()
      or owner = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 2) Tabla `announcements`: separar insert vs update/delete del coordinator
-- ---------------------------------------------------------------------
drop policy if exists announcements_coordinator_all on public.announcements;

create policy announcements_coordinator_insert
  on public.announcements for insert
  with check (public.is_any_coordinator());

create policy announcements_coordinator_update
  on public.announcements for update
  using (public.is_coordinator_of_announcement(id))
  with check (public.is_coordinator_of_announcement(id));

create policy announcements_coordinator_delete
  on public.announcements for delete
  using (public.is_coordinator_of_announcement(id));
