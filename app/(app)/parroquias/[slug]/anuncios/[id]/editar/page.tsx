import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadSchedulesForEntity } from "@/lib/schedule.server";
import {
  AnuncioForm,
  type AnnouncementFormData,
  type AnnouncementKind,
} from "@/app/(app)/admin/anuncios/anuncio-form";

async function resolveTargetLabel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kind: string,
  id: string | null
): Promise<string> {
  if (!id) return "";
  if (kind === "song") {
    const { data } = await supabase
      .from("songs")
      .select("title")
      .eq("id", id)
      .maybeSingle();
    return data?.title ?? id;
  }
  if (kind === "playlist") {
    const { data } = await supabase
      .from("playlists")
      .select("name")
      .eq("id", id)
      .maybeSingle();
    return data?.name ?? id;
  }
  if (kind === "parish") {
    const { data } = await supabase
      .from("parishes")
      .select("name")
      .eq("id", id)
      .maybeSingle();
    return data?.name ?? id;
  }
  return id;
}

export default async function EditarAnuncioScopedPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  if (slug === "arquidiocesis") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/parroquias/${slug}/anuncios`);

  const { data: parish } = await supabase
    .from("parishes")
    .select("id, slug, name")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!parish) notFound();

  const [rolesRes, memberRes] = await Promise.all([
    supabase.from("user_roles").select("roles(name)").eq("user_id", user.id),
    supabase
      .from("parish_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("parish_id", parish.id)
      .maybeSingle(),
  ]);
  const roleNames = (rolesRes.data ?? [])
    .map((r) => {
      const rel = r.roles as { name: string } | { name: string }[] | null;
      const single = Array.isArray(rel) ? rel[0] : rel;
      return single?.name;
    })
    .filter((n): n is string => Boolean(n));
  const isAdmin = roleNames.includes("admin");
  const isEditor = roleNames.includes("editor");
  const isCoordinator = memberRes.data?.role === "coordinator";
  if (!isAdmin && !isEditor && !isCoordinator) {
    redirect(`/parroquias/${slug}/anuncios`);
  }

  // Fix IDOR: validar que el anuncio esté asociado a esta parroquia.
  const { data: ownership } = await supabase
    .from("announcement_parishes")
    .select("parish_id")
    .eq("announcement_id", id)
    .eq("parish_id", parish.id)
    .maybeSingle();
  if (!ownership) notFound();

  const [annRes, apRes, schedules, docRes] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        "id, title, body, kind, priority, featured, target_kind, target_id, target_url, image_path"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("announcement_parishes")
      .select("parish_id")
      .eq("announcement_id", id),
    loadSchedulesForEntity("announcement", id),
    supabase
      .from("announcement_documents")
      .select("announcement_id")
      .eq("announcement_id", id)
      .maybeSingle(),
  ]);

  if (!annRes.data) notFound();
  const ann = annRes.data;
  const linkedParishIds = (apRes.data ?? []).map((r) => r.parish_id as string);

  const targetLabel = await resolveTargetLabel(
    supabase,
    ann.target_kind as string,
    (ann.target_id as string | null) ?? null
  );

  const initial: AnnouncementFormData = {
    id: ann.id as string,
    title: ann.title as string,
    body: (ann.body as string | null) ?? "",
    priority: (ann.priority as number) ?? 0,
    featured: Boolean(ann.featured),
    kind: (ann.kind as AnnouncementKind) ?? null,
    target_kind: ann.target_kind as AnnouncementFormData["target_kind"],
    target_id: (ann.target_id as string | null) ?? null,
    target_url: (ann.target_url as string | null) ?? "",
    target_label: targetLabel,
    image_path: (ann.image_path as string | null) ?? null,
    scope: linkedParishIds.length === 0 ? "all" : "selected",
    parish_ids: linkedParishIds,
    schedules: schedules.map((s) => ({
      date_mode: s.date_mode,
      weekdays: s.weekdays,
      start_date: s.start_date,
      end_date: s.end_date,
      time_mode: s.time_mode,
      start_time: s.start_time,
      end_time: s.end_time,
    })),
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">
          {parish.name}
        </p>
        <h1 className="text-2xl text-page-title">Editar aviso</h1>
      </header>

      <AnuncioForm
        mode="edit"
        initial={initial}
        parishes={[parish]}
        allowGlobal={false}
        lockedParishIds={[parish.id]}
        restrictKinds={!isAdmin && !isEditor}
        hideDocumentOption={!isAdmin && !isEditor}
        backHref={`/parroquias/${slug}/anuncios`}
        hasDocument={Boolean(docRes.data)}
      />
    </main>
  );
}
