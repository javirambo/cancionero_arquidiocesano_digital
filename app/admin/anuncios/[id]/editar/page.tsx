import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnuncioForm, type AnnouncementFormData } from "../../anuncio-form";
import { listScopedParishes } from "../../scoped-parishes";

function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function resolveTargetLabel(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kind: string,
  id: string | null
): Promise<string> {
  if (!id) return "";
  if (kind === "song") {
    const { data } = await supabase.from("songs").select("title").eq("id", id).maybeSingle();
    return data?.title ?? id;
  }
  if (kind === "playlist") {
    const { data } = await supabase.from("playlists").select("name").eq("id", id).maybeSingle();
    return data?.name ?? id;
  }
  if (kind === "parish") {
    const { data } = await supabase.from("parishes").select("name").eq("id", id).maybeSingle();
    return data?.name ?? id;
  }
  return id;
}

export default async function EditarAnuncioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [annRes, apRes, parishes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, body, starts_at, ends_at, priority, target_kind, target_id, target_url")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("announcement_parishes").select("parish_id").eq("announcement_id", id),
    listScopedParishes(),
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
    starts_at: toDateTimeLocal(ann.starts_at as string),
    ends_at: toDateTimeLocal(ann.ends_at as string),
    priority: (ann.priority as number) ?? 0,
    target_kind: ann.target_kind as AnnouncementFormData["target_kind"],
    target_id: (ann.target_id as string | null) ?? null,
    target_url: (ann.target_url as string | null) ?? "",
    target_label: targetLabel,
    scope: linkedParishIds.length === 0 ? "all" : "selected",
    parish_ids: linkedParishIds,
  };

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/anuncios"
          className="text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl">Editar anuncio</h1>
      </header>

      <AnuncioForm mode="edit" initial={initial} parishes={parishes} />
    </main>
  );
}
