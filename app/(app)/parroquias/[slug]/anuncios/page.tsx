import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { describeSchedule, isVisibleNow } from "@/lib/schedule";
import { loadSchedules } from "@/lib/schedule.server";

type AnnouncementRow = {
  id: string;
  title: string;
  priority: number;
  kind: string | null;
  target_kind: string;
};

export default async function ParroquiaAnunciosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "arquidiocesis") notFound();

  const supabase = await createClient();
  const { data: parish } = await supabase
    .from("parishes")
    .select("id, slug, name")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!parish) notFound();

  // Permisos: gestión visible para admin/editor/coordinator de esta parroquia.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canManage = false;
  if (user) {
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
    canManage = isAdmin || isEditor || isCoordinator;
  }

  // Anuncios cuyos destinatarios incluyen esta parroquia.
  const { data: links } = await supabase
    .from("announcement_parishes")
    .select("announcement_id")
    .eq("parish_id", parish.id);
  const ids = (links ?? []).map((l) => l.announcement_id as string);

  let announcements: AnnouncementRow[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("announcements")
      .select("id, title, kind, priority, target_kind")
      .in("id", ids)
      .order("priority", { ascending: false });
    announcements = (data ?? []) as AnnouncementRow[];
  }

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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">
          {parish.name}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl text-page-title">Avisos</h1>
          {canManage && (
            <Link
              href={`/parroquias/${parish.slug}/anuncios/nuevo`}
              className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
            >
              + Nuevo
            </Link>
          )}
        </div>
      </header>

      {announcements.length === 0 ? (
        <p className="rounded-xl border border-border bg-background p-6 text-base normal-case text-muted-foreground">
          Esta parroquia todavía no publicó avisos.
        </p>
      ) : (
        <>
          <Group
            title="Vigentes ahora"
            rows={vigentes}
            sched={sched}
            canManage={canManage}
            parishSlug={parish.slug}
          />
          <Group
            title="No vigentes ahora"
            rows={noVigentes}
            sched={sched}
            canManage={canManage}
            parishSlug={parish.slug}
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
  sched,
  canManage,
  parishSlug,
  muted,
}: {
  title: string;
  rows: AnnouncementRow[];
  sched: Map<string, Parameters<typeof describeSchedule>[0][]>;
  canManage: boolean;
  parishSlug: string;
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
          const reglas = sched.get(a.id) ?? [];
          const meta: string[] = [];
          if (a.kind) meta.push(a.kind);
          if (a.priority !== 0) meta.push(`prioridad ${a.priority}`);
          if (a.target_kind !== "none") meta.push(`atajo: ${a.target_kind}`);
          const content = (
            <>
              <span className="text-base text-song-title">{a.title}</span>
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
              {meta.length > 0 && (
                <span className="text-xs normal-case text-muted-foreground">
                  {meta.join(" · ")}
                </span>
              )}
            </>
          );
          return (
            <li
              key={a.id}
              className={`px-5 py-3 transition-colors hover:bg-sidebar ${
                muted ? "opacity-60" : ""
              }`}
            >
              {canManage ? (
                <Link
                  href={`/parroquias/${parishSlug}/anuncios/${a.id}/editar`}
                  className="flex flex-col gap-0.5"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex flex-col gap-0.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
