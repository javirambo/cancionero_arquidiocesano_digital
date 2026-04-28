import { listSongsWithCapabilities } from "@/lib/songs";
import { SongRow } from "@/app/components/song-row";

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
        <form
          action="/canciones"
          method="get"
          role="search"
          className="flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-background px-5 py-2 shadow-sm focus-within:border-primary"
        >
          <label htmlFor="q" className="sr-only">
            Buscar canción
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={term}
            placeholder="Título o fragmento de letra…"
            autoComplete="off"
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-primary-hover"
          >
            Buscar
          </button>
        </form>
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
