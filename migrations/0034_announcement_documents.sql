-- =====================================================================
-- Cancionero Arquidiocesano Digital — Documentos rich asociados a anuncios
-- Migración: 0034_announcement_documents
-- Referencia: documentacion/modelo_de_datos.md (announcements, nuevo
--             announcement_documents), documentacion/casos_de_uso.md.
--
-- Cambios:
--   1. Ampliar `announcements.kind` para incluir 'indicaciones'.
--   2. Ampliar `announcements.target_kind` para incluir 'document'.
--      Documento no requiere target_id: se busca por announcement_id en
--      announcement_documents. Se actualiza el CHECK de consistencia.
--   3. Crear tabla `announcement_documents` (1:1 con announcement).
--      Guarda HTML rich (saneado en la app antes de renderizar al
--      público). El documento se crea cuando el editor lo guarda por
--      primera vez (no se autocrea con el anuncio).
--   4. RLS:
--      - SELECT: si podés ver el anuncio (announcement_is_visible_to_user
--        ya considera parroquia/permisos; la vigencia se evalúa
--        client-side con entity_schedules).
--      - INSERT/UPDATE/DELETE: si podés editar el anuncio
--        (admin/editor global o coordinator de alguna de sus parroquias).
-- =====================================================================

-- 1. Ampliar kind
alter table public.announcements drop constraint if exists announcements_kind_check;
alter table public.announcements add constraint announcements_kind_check
  check (kind in ('solemnidad','fiesta','memoria','tiempo','indicaciones'));

-- 2. Ampliar target_kind + consistencia
alter table public.announcements drop constraint if exists announcements_target_kind_check;
alter table public.announcements
  alter column target_kind set default 'none';

-- Drop y recreate del check de valores de target_kind (nombre auto-generado).
do $$
declare
  cname text;
begin
  select c.conname into cname
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'announcements'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%target_kind%in%';
  if cname is not null then
    execute format('alter table public.announcements drop constraint %I', cname);
  end if;
end
$$;

alter table public.announcements add constraint announcements_target_kind_check
  check (target_kind in ('song','playlist','parish','external','none','document'));

-- Consistencia: document no exige target_id ni target_url (se vincula vía
-- announcement_documents por announcement_id).
alter table public.announcements drop constraint if exists announcements_target_consistency_check;
alter table public.announcements add constraint announcements_target_consistency_check
  check (
    (target_kind = 'external' and target_url is not null)
    or (target_kind in ('song','playlist','parish') and target_id is not null)
    or (target_kind in ('none','document'))
  );

-- 3. Tabla announcement_documents
create table if not exists public.announcement_documents (
  announcement_id uuid primary key
    references public.announcements(id) on delete cascade,
  content_html text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists announcement_documents_set_updated_at on public.announcement_documents;
create trigger announcement_documents_set_updated_at
  before update on public.announcement_documents
  for each row execute function public.set_updated_at();

alter table public.announcement_documents enable row level security;

-- 4. RLS: lectura sigue la regla del anuncio, escritura igual que el anuncio.
drop policy if exists announcement_documents_select on public.announcement_documents;
create policy announcement_documents_select
  on public.announcement_documents for select
  using (
    public.is_admin()
    or public.announcement_is_visible_to_user(announcement_id)
    or public.is_coordinator_of_announcement(announcement_id)
  );

drop policy if exists announcement_documents_admin_all on public.announcement_documents;
create policy announcement_documents_admin_all
  on public.announcement_documents for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists announcement_documents_coordinator_all on public.announcement_documents;
create policy announcement_documents_coordinator_all
  on public.announcement_documents for all
  using (public.is_coordinator_of_announcement(announcement_id))
  with check (public.is_coordinator_of_announcement(announcement_id));
