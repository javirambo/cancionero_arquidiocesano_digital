import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { describeSchedule, isVisibleNow } from "@/lib/schedule";
import { loadSchedules } from "@/lib/schedule.server";
import { getAdminAccess } from "../access";

type AnnouncementRow = {
  id: string;
  title: string;
  priority: number;
  kind: string | null;
  target_kind: string;
};

type ParishRow = { id: string; slug: string; name: string };

export default async function AdminAnunciosPage() {
  const supabase = await createClient();
  const access = await getAdminAccess();

  const [annRes, apRes, parishesRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, kind, priority, target_kind")
      .order("priority", { ascending: false }),
    supabase.from("announcement_parishes").select("announcement_id, parish_id"),
    supabase.from("parishes").select("id, slug, name"),
  ]);

  const allAnnouncements = (annRes.data ?? []) as AnnouncementRow[];
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

  let coordinatorParishIds = new Set<string>();
  if (!access.isAdmin && !access.isEditor && access.userId) {
    const { data: members } = await supabase
      .from("parish_members")
      .select("parish_id")
      .eq("user_id", access.userId)
      .eq("role", "coordinator");
    coordinatorParishIds = new Set(
      (members ?? []).map((m) => m.parish_id as string)
    );
  }
  const announcements =
    access.isAdmin || access.isEditor
      ? allAnnouncements
      : allAnnouncements.filter((a) => {
          const dests = destByAnnouncement.get(a.id) ?? [];
          return dests.some((p) => coordinatorParishIds.has(p.id));
        });

  const sched = await loadSchedules(
    "announcement",
    announcements.map((a) => a.id)
  );

  const vigentes: AnnouncementRow[] = [];
  const noVigentes: AnnouncementRow[] = [];
  for (const a of announcements) {
    if (isVisibleNow(sched.get(a.id))) vigentes.push(a);
    else noVigentes.push(a);
  }

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl">Anuncios</h1>
          <Link
            href="/admin/anuncios/nuevo"
            className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
          >
            + Nuevo
          </Link>
        </div>
        <p className="text-sm normal-case text-muted-foreground">
          Anuncios y novedades destacadas en la home, con destino global o multi-parroquia. Configurá vigencia y prioridad.
        </p>
      </header>

      {announcements.length === 0 ? (
        <p className="text-sm normal-case text-muted-foreground">
          No hay anuncios cargados todavía.
        </p>
      ) : (
        <>
          <Group title="Vigentes ahora" rows={vigentes} dest={destByAnnouncement} sched={sched} />
          <Group
            title="No vigentes ahora"
            rows={noVigentes}
            dest={destByAnnouncement}
            sched={sched}
            muted
          />
        </>
      )}
    </main>
  );
}

function Group({
  title,
  rows,
  dest,
  sched,
  muted,
}: {
  title: string;
  rows: AnnouncementRow[];
  dest: Map<string, ParishRow[]>;
  sched: Map<string, Parameters<typeof describeSchedule>[0][]>;
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
          const reglas = sched.get(a.id) ?? [];
          const destText =
            destinatarios.length === 0
              ? "Todas las parroquias"
              : destinatarios.map((p) => p.name).join(", ");
          const meta: string[] = [];
          if (a.kind) meta.push(a.kind);
          if (a.priority !== 0) meta.push(`prioridad ${a.priority}`);
          if (a.target_kind !== "none") meta.push(`atajo: ${a.target_kind}`);
          return (
            <li
              key={a.id}
              className={`px-5 py-3 transition-colors hover:bg-sidebar ${
                muted ? "opacity-60" : ""
              }`}
            >
              <Link
                href={`/admin/anuncios/${a.id}/editar`}
                className="flex flex-col gap-0.5"
              >
                <span className="text-base text-primary">{a.title}</span>
                {reglas.length > 0 ? (
                  <ul className="flex flex-col gap-0.5">
                    {reglas.map((r, i) => (
                      <li
                        key={i}
                        className="text-xs normal-case text-muted-foreground"
                      >
                        {describeSchedule(r)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs normal-case text-muted-foreground">
                    Siempre vigente
                  </span>
                )}
                <span className="text-xs normal-case text-muted-foreground">
                  {destText}
                </span>
                {meta.length > 0 && (
                  <span className="text-xs normal-case text-muted-foreground">
                    {meta.join(" · ")}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
