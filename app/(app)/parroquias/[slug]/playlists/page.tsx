import Link from "next/link";
import { notFound } from "next/navigation";
import { getParishBySlug } from "@/lib/songs";
import { listPlaylistsForParish, type ParishPlaylistItem } from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { loadSchedules } from "@/lib/schedule.server";
import { isVisibleNow } from "@/lib/schedule";
import { EditIcon } from "@/app/components/icons";

export default async function ParroquiaPlaylistsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parish = await getParishBySlug(slug);
  if (!parish) notFound();

  // ¿El usuario puede crear/editar playlists en esta parroquia?
  // admin (cualquier parroquia) o coordinator de esta parroquia.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAdmin = false;
  let isParishCoordinator = false;
  if (user) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", user.id);
    const roleNames = (roles ?? [])
      .map((r) => {
        const rel = r.roles as { name: string } | { name: string }[] | null;
        const single = Array.isArray(rel) ? rel[0] : rel;
        return single?.name;
      })
      .filter((n): n is string => Boolean(n));
    isAdmin = roleNames.includes("admin");
    if (!isAdmin) {
      const { data: member } = await supabase
        .from("parish_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("parish_id", parish.id)
        .maybeSingle();
      isParishCoordinator = member?.role === "coordinator";
    }
  }
  const canManage = isAdmin || isParishCoordinator;

  // Si puede gestionar, incluimos también las playlists fuera de su ventana
  // horaria/fecha para que pueda verlas y editarlas (marcadas "No activa hoy").
  const playlists = await listPlaylistsForParish(parish.id, {
    parishSlug: parish.slug,
    includeOutOfWindow: canManage,
  });

  // Vigencia actual de cada playlist (para el cartel "No activa hoy").
  const sched = await loadSchedules(
    "playlist",
    playlists.map((p) => p.id)
  );
  const isActiveNow = (id: string) => isVisibleNow(sched.get(id));

  // ¿Puede editar esta playlist concreta? own → si gestiona la parroquia;
  // cualquiera → si es admin. Las diocesanas no se editan desde acá.
  const canEditItem = (p: ParishPlaylistItem) => {
    if (p.relation === "archdiocesan") return false;
    if (isAdmin) return true;
    return p.relation === "own" && isParishCoordinator;
  };

  const groups: { key: string; label: string; items: ParishPlaylistItem[] }[] = [
    { key: "own", label: "", items: playlists.filter((p) => p.relation === "own") },
    { key: "subscribed", label: "Compartidas con esta parroquia", items: playlists.filter((p) => p.relation === "subscribed") },
    { key: "archdiocesan", label: "De la Arquidiócesis", items: playlists.filter((p) => p.relation === "archdiocesan") },
  ];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl text-page-title">Mis listas</h1>
          {canManage && (
            <Link
              href={`/parroquias/${parish.slug}/playlists/nueva`}
              className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
            >
              + Nueva
            </Link>
          )}
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">
          DE {parish.name}
        </p>
      </header>

      {playlists.length === 0 ? (
        <p className="rounded-xl border border-border bg-background p-6 text-base normal-case text-muted-foreground">
          Esta parroquia todavía no tiene playlists.
        </p>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.key} className="flex flex-col gap-3">
              {g.label && (
                <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
                  {g.label}
                </h2>
              )}
              <ul className="grid gap-3 sm:grid-cols-2">
                {g.items.map((p) => {
                  const editable = canEditItem(p);
                  const inactive = !isActiveNow(p.id);
                  return (
                    <li key={p.id} className="relative">
                      <Link
                        href={`/playlists/${p.id}`}
                        className={`flex h-full flex-col gap-1 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary ${
                          editable ? "pr-12" : ""
                        }`}
                      >
                        <span className="text-base text-primary">{p.name}</span>
                        {p.relation !== "own" && p.parish && (
                          <span className="text-xs normal-case text-muted-foreground">
                            {p.parish.name}
                          </span>
                        )}
                        {inactive && (
                          <span className="mt-1 inline-flex w-fit items-center rounded-full border border-border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            No activa hoy
                          </span>
                        )}
                      </Link>
                      {editable && (
                        <Link
                          href={`/playlists/${p.id}/editar`}
                          aria-label={`Editar ${p.name}`}
                          title="Editar lista"
                          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          <EditIcon />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
      )}
    </main>
  );
}
