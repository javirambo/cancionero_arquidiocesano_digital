import Link from "next/link";
import { notFound } from "next/navigation";
import { getParishBySlug, listAnnouncementsForParish } from "@/lib/songs";
import { listPlaylistsForParish } from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementCard } from "@/app/components/announcement-card";

export default async function ParroquiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parish = await getParishBySlug(slug);
  if (!parish) notFound();

  const playlists = await listPlaylistsForParish(parish.id, { parishSlug: parish.slug });
  const previewPlaylists = playlists.slice(0, 4);

  // Anuncios solo si el usuario es miembro de esta parroquia.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let parishAnnouncements: Awaited<
    ReturnType<typeof listAnnouncementsForParish>
  > = { items: [], total: 0 };
  if (user) {
    const { data: member } = await supabase
      .from("parish_members")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("parish_id", parish.id)
      .maybeSingle();
    if (member) {
      parishAnnouncements = await listAnnouncementsForParish(parish.id);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <Link
        href="/parroquias"
        className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-secondary hover:underline"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Volver a parroquias
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            Parroquia
          </p>
          <h1 className="text-3xl">{parish.name}</h1>
          {(parish.address || parish.city) && (
            <p className="text-sm normal-case text-muted-foreground">
              {[parish.address, parish.city].filter(Boolean).join(" · ")}
            </p>
          )}
          {parish.description && (
            <p className="max-w-2xl text-base normal-case text-muted-foreground">
              {parish.description}
            </p>
          )}
        </div>
      </header>

      <section aria-labelledby="playlists-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="playlists-heading" className="text-xl">
            Listas
          </h2>
          {playlists.length > previewPlaylists.length && (
            <Link
              href={`/parroquias/${parish.slug}/playlists`}
              className="text-sm normal-case text-primary hover:underline"
            >
              Ver todas ({playlists.length})
            </Link>
          )}
        </div>
        {previewPlaylists.length === 0 ? (
          <p className="rounded-xl border border-border bg-sidebar p-6 text-base normal-case text-muted-foreground">
            Esta parroquia todavía no publicó playlists.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {previewPlaylists.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/playlists/${p.id}`}
                  className="flex h-full flex-col gap-2 rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary"
                >
                  <span className="text-lg text-primary">{p.name}</span>
                  {p.relation === "archdiocesan" && (
                    <span className="text-xs uppercase tracking-wide text-secondary">
                      De la Arquidiócesis
                    </span>
                  )}
                  {p.relation === "subscribed" && p.parish && (
                    <span className="text-xs uppercase tracking-wide text-secondary">
                      Compartida por {p.parish.name}
                    </span>
                  )}
                  {p.description && (
                    <span className="text-sm normal-case text-muted-foreground">
                      {p.description}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {parishAnnouncements.items.length > 0 && (
        <section
          aria-labelledby="anuncios-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="anuncios-heading" className="text-xl">
            Anuncios
          </h2>
          <ul className="grid gap-3">
            {parishAnnouncements.items.map((item, i) => (
              <li key={i}>
                <AnnouncementCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
