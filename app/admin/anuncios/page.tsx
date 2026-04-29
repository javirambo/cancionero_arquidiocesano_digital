import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type AnnouncementRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  priority: number;
  target_kind: string;
};

type ParishRow = { id: string; slug: string; name: string };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function AdminAnunciosPage() {
  const supabase = await createClient();

  const [annRes, apRes, parishesRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, starts_at, ends_at, priority, target_kind")
      .order("starts_at", { ascending: false }),
    supabase.from("announcement_parishes").select("announcement_id, parish_id"),
    supabase.from("parishes").select("id, slug, name"),
  ]);

  const announcements = (annRes.data ?? []) as AnnouncementRow[];
  const links = (apRes.data ?? []) as Array<{ announcement_id: string; parish_id: string }>;
  const parishes = (parishesRes.data ?? []) as ParishRow[];
  const parishById = new Map(parishes.map((p) => [p.id, p]));

  const destByAnnouncement = new Map<string, ParishRow[]>();
  for (const link of links) {
    const parish = parishById.get(link.parish_id);
    if (!parish) continue;
    const arr = destByAnnouncement.get(link.announcement_id) ?? [];
    arr.push(parish);
    destByAnnouncement.set(link.announcement_id, arr);
  }

  const now = Date.now();
  const vigentes: AnnouncementRow[] = [];
  const programados: AnnouncementRow[] = [];
  const vencidos: AnnouncementRow[] = [];
  for (const a of announcements) {
    const starts = new Date(a.starts_at).getTime();
    const ends = new Date(a.ends_at).getTime();
    if (now < starts) programados.push(a);
    else if (now > ends) vencidos.push(a);
    else vigentes.push(a);
  }

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="flex-1 text-2xl">Anuncios</h1>
        <Link
          href="/admin/anuncios/nuevo"
          className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
        >
          + Nuevo anuncio
        </Link>
      </header>

      {announcements.length === 0 ? (
        <p className="text-sm normal-case text-muted-foreground">
          No hay anuncios cargados todavía.
        </p>
      ) : (
        <>
          <Group title="Vigentes" rows={vigentes} dest={destByAnnouncement} />
          <Group title="Programados" rows={programados} dest={destByAnnouncement} />
          <Group title="Vencidos" rows={vencidos} dest={destByAnnouncement} muted />
        </>
      )}
    </main>
  );
}

function Group({
  title,
  rows,
  dest,
  muted,
}: {
  title: string;
  rows: AnnouncementRow[];
  dest: Map<string, ParishRow[]>;
  muted?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
        {title} ({rows.length})
      </h2>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {rows.map((a) => {
          const destinatarios = dest.get(a.id) ?? [];
          return (
            <li
              key={a.id}
              className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sidebar ${
                muted ? "opacity-60" : ""
              }`}
            >
              <Link
                href={`/admin/anuncios/${a.id}/editar`}
                className="flex flex-1 flex-col gap-0.5"
              >
                <span className="text-base text-primary">{a.title}</span>
                <span className="text-xs normal-case text-muted-foreground">
                  {fmt(a.starts_at)} — {fmt(a.ends_at)}
                  {a.priority !== 0 && ` · prioridad ${a.priority}`}
                  {a.target_kind !== "none" && ` · atajo: ${a.target_kind}`}
                </span>
              </Link>
              <span className="hidden sm:inline-block text-xs normal-case text-muted-foreground">
                {destinatarios.length === 0
                  ? "Todas las parroquias"
                  : destinatarios.map((p) => p.slug).join(", ")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
