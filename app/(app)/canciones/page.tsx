import { listSongsWithCapabilities } from "@/lib/songs";
import { SongRow } from "@/app/components/song-row";
import { SearchInput } from "./search-input";

export const metadata = {
  title: "Canciones · Cancionero Arquidiocesano",
};

export default async function CancionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const VISIBLE = 100;
  const fetched = await listSongsWithCapabilities(term, VISIBLE + 1);
  const hasMore = !term && fetched.length > VISIBLE;
  const songs = hasMore ? fetched.slice(0, VISIBLE) : fetched;
  const fadeStart = hasMore ? Math.max(0, songs.length - 5) : songs.length;
  const fadeOpacities = [0.8, 0.6, 0.4, 0.25, 0.1];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl">Canciones</h1>
        <p className="text-base normal-case text-muted-foreground">
          {term
            ? `Resultados para "${term}"`
            : "Catálogo completo del cancionero."}
        </p>
        <SearchInput initialValue={term} />
      </header>

      {songs.length === 0 ? (
        <p className="rounded-xl border border-border bg-sidebar p-6 text-base normal-case text-muted-foreground">
          No se encontraron canciones para tu búsqueda. Probá con otro término.
        </p>
      ) : (
        <>
          <div
            role="list"
            className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background"
          >
            {songs.map((s, i) => {
              if (i >= fadeStart) {
                return (
                  <div
                    key={s.id}
                    style={{ opacity: fadeOpacities[i - fadeStart] ?? 1 }}
                  >
                    <SongRow song={s} />
                  </div>
                );
              }
              return <SongRow key={s.id} song={s} />;
            })}
          </div>
          {hasMore && (
            <p className="text-center text-lg normal-case text-muted-foreground">
              … existen más canciones. Usá el buscador para encontrar la que querés.
            </p>
          )}
        </>
      )}
    </main>
  );
}
