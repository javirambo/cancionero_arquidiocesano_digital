import Link from "next/link";
import { notFound } from "next/navigation";
import { getParishBySlug } from "@/lib/songs";
import { listPlaylistsForParish, type ParishPlaylistItem } from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";

export default async function ParroquiaPlaylistsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parish = await getParishBySlug(slug);
  if (!parish) notFound();

  const playlists = await listPlaylistsForParish(parish.id, { parishSlug: parish.slug });

  // ¿Puede crear playlists en esta parroquia?
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canCreate = false;
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
    if (roleNames.includes("admin")) {
      canCreate = true;
    } else {
      const { data: member } = await supabase
        .from("parish_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("parish_id", parish.id)
        .maybeSingle();
      if (member?.role === "coordinator") canCreate = true;
    }
  }

  const groups: { label: string; items: ParishPlaylistItem[] }[] = [
    { label: "De esta parroquia", items: playlists.filter((p) => p.relation === "own") },
    { label: "Compartidas con esta parroquia", items: playlists.filter((p) => p.relation === "subscribed") },
    { label: "De la Arquidiócesis", items: playlists.filter((p) => p.relation === "archdiocesan") },
  ];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            {parish.name}
          </p>
          <h1 className="text-2xl">Playlists</h1>
        </div>
        {canCreate && (
          <Link
            href={`/parroquias/${parish.slug}/playlists/nueva`}
            className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
          >
            + Nueva playlist
          </Link>
        )}
      </header>

      {playlists.length === 0 ? (
        <p className="rounded-xl border border-border bg-sidebar p-6 text-base normal-case text-muted-foreground">
          Esta parroquia todavía no tiene playlists.
        </p>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.label} className="flex flex-col gap-3">
              <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
                {g.label}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {g.items.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/playlists/${p.id}`}
                      className="flex h-full flex-col gap-1 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary"
                    >
                      <span className="text-base text-primary">{p.name}</span>
                      {p.relation !== "own" && p.parish && (
                        <span className="text-xs normal-case text-muted-foreground">
                          {p.parish.name}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </main>
  );
}
