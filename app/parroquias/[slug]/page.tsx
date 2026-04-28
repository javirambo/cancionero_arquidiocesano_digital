import Link from "next/link";
import { notFound } from "next/navigation";
import { getParishBySlug, listPlaylists } from "@/lib/songs";

export default async function ParroquiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parish = await getParishBySlug(slug);
  if (!parish) notFound();

  const playlists = await listPlaylists(slug);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <nav className="text-sm normal-case text-muted-foreground">
        <Link href="/parroquias" className="hover:text-primary">
          ← Parroquias
        </Link>
      </nav>

      <header className="flex flex-col gap-2">
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
      </header>

      <section aria-labelledby="playlists-heading" className="flex flex-col gap-4">
        <h2 id="playlists-heading" className="text-xl">
          Playlists
        </h2>
        {playlists.length === 0 ? (
          <p className="rounded-xl border border-border bg-sidebar p-6 text-base normal-case text-muted-foreground">
            Esta parroquia todavía no publicó playlists.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {playlists.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/playlists/${parish.slug}/${p.slug}`}
                  className="flex h-full flex-col gap-2 rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary"
                >
                  <span className="text-lg text-primary">{p.name}</span>
                  {p.event_date && (
                    <span className="text-xs normal-case text-muted-foreground">
                      {new Date(p.event_date).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
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
    </main>
  );
}
