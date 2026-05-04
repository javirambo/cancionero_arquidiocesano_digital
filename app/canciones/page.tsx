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
  const songs = await listSongsWithCapabilities(term);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
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
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background">
          {songs.map((s) => (
            <SongRow key={s.id} song={s} />
          ))}
        </ul>
      )}
    </main>
  );
}
